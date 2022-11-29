import {
  GetCurrentLocationDescription,
  EchartAction,
  WatchCurrentLocationDescription,
} from "entities/DataTree/actionTriggers";
import { EventType } from "constants/AppsmithActionConstants/ActionConstants";
import {
  executeAppAction,
  TriggerMeta,
} from "sagas/ActionExecution/ActionExecutionSagas";
import _find from "lodash/find";
import { call, put, spawn, take, select } from "redux-saga/effects";
import {
  logActionExecutionError,
  TriggerFailureError,
} from "sagas/ActionExecution/errorUtils";
import { setUserCurrentGeoLocation } from "actions/browserRequestActions";
import { Channel, channel } from "redux-saga";
import { getEchartWidget } from "selectors/widgetSelectors";
import { FlattenedWidgetProps } from "reducers/entityReducers/canvasWidgetsReducer";
import { ActionValidationError } from "sagas/ActionExecution/errorUtils";
import { ActionTriggerType } from "entities/DataTree/actionTriggers";
import { getType, Types } from "utils/TypeHelpers";

// Making the getCurrentPosition call in a promise fashion
const getUserLocation = (options?: PositionOptions) =>
  new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (location) => resolve(location),
      (error) => reject(error),
      options,
    );
  });

/**
 * We need to extract and set certain properties only because the
 * return value is a "class" with functions as well and
 * that cant be stored in the data tree
 **/
const extractGeoLocation = (
  location: GeolocationPosition,
): GeolocationPosition => {
  const {
    coords: {
      accuracy,
      altitude,
      altitudeAccuracy,
      heading,
      latitude,
      longitude,
      speed,
    },
  } = location;
  const coords: GeolocationCoordinates = {
    altitude,
    altitudeAccuracy,
    heading,
    latitude,
    longitude,
    accuracy,
    speed,
  };
  return {
    coords,
    timestamp: location.timestamp,
  };
};

let successChannel: Channel<any> | undefined;
let errorChannel: Channel<any> | undefined;

function* successCallbackHandler() {
  if (successChannel) {
    while (true) {
      const payload: unknown = yield take(successChannel);
      // @ts-expect-error: payload is unknown
      const { callback, eventType, location, triggerMeta } = payload;
      const currentLocation = extractGeoLocation(location);
      yield put(setUserCurrentGeoLocation(currentLocation));
      if (callback) {
        yield call(executeAppAction, {
          dynamicString: callback,
          callbackData: [currentLocation],
          event: { type: eventType },
          triggerPropertyName: triggerMeta.triggerPropertyName,
          source: triggerMeta.source,
        });
      }
    }
  }
}

function* errorCallbackHandler() {
  if (errorChannel) {
    while (true) {
      const payload: unknown = yield take(errorChannel);
      // @ts-expect-error: payload is unknown
      const { callback, error, eventType, triggerMeta } = payload;
      if (callback) {
        yield call(executeAppAction, {
          dynamicString: callback,
          callbackData: [error],
          event: { type: eventType },
          triggerPropertyName: triggerMeta.triggerPropertyName,
          source: triggerMeta.source,
        });
      } else {
        throw new TriggerFailureError(error.message, triggerMeta);
      }
    }
  }
}

export function* getCurrentLocationSaga(
  actionPayload: GetCurrentLocationDescription["payload"],
  eventType: EventType,
  triggerMeta: TriggerMeta,
) {
  try {
    const location: GeolocationPosition = yield call(
      getUserLocation,
      actionPayload.options,
    );

    const currentLocation = extractGeoLocation(location);

    yield put(setUserCurrentGeoLocation(currentLocation));
    return [currentLocation];
  } catch (error) {
    logActionExecutionError(
      (error as Error).message,
      triggerMeta.source,
      triggerMeta.triggerPropertyName,
    );
  }
}

export function* getEchartSaga(
  actionPayload: EchartAction["payload"],
  eventType: EventType,
  triggerMeta: TriggerMeta,
) {
  const { widgetName, funcName, options } = actionPayload;
  const echartWidgets: {
    [widgetId: string]: FlattenedWidgetProps;
  } = yield select(getEchartWidget);
  const _target = _find(echartWidgets, (it: any) => it.name === widgetName);
  const _instance = _target?.instance;
  if (typeof widgetName !== "string") {
    throw new ActionValidationError(
      ActionTriggerType.CALL_FUNC,
      "widgetName",
      Types.STRING,
      getType(widgetName),
    );
  }
  if (typeof funcName !== "string") {
    throw new ActionValidationError(
      ActionTriggerType.CALL_FUNC,
      "funcName",
      Types.STRING,
      getType(funcName),
    );
  }

  try {
    if (_instance) {
      const res = _instance[funcName](options);
      if (funcName === "getDom") {
        logActionExecutionError(
          "postmessage could not be cloned",
          triggerMeta.source,
          triggerMeta.triggerPropertyName,
        );
      }
      return [res];
    }
  } catch (error) {
    logActionExecutionError(
      (error as Error).message,
      triggerMeta.source,
      triggerMeta.triggerPropertyName,
    );
    return [error];
  }
}

let watchId: number | undefined;
export function* watchCurrentLocation(
  actionPayload: WatchCurrentLocationDescription["payload"],
  eventType: EventType,
  triggerMeta: TriggerMeta,
) {
  if (watchId) {
    // When a watch is already active, we will not start a new watch.
    // at a given point in time, only one watch is active
    logActionExecutionError(
      "A watchLocation is already active. Clear it before before starting a new one",
      triggerMeta.source,
      triggerMeta.triggerPropertyName,
    );
  }
  successChannel = channel();
  errorChannel = channel();
  yield spawn(successCallbackHandler);
  yield spawn(errorCallbackHandler);
  watchId = navigator.geolocation.watchPosition(
    (location) => {
      if (successChannel) {
        successChannel.put({
          location,
          callback: actionPayload.onSuccess,
          eventType,
          triggerMeta,
        });
      }
    },
    (error) => {
      if (errorChannel) {
        errorChannel.put({
          error,
          callback: actionPayload.onError,
          eventType,
          triggerMeta,
        });
      }
    },
    actionPayload.options,
  );
}

export function* stopWatchCurrentLocation(
  eventType: EventType,
  triggerMeta: TriggerMeta,
) {
  if (watchId === undefined) {
    logActionExecutionError(
      "No location watch active",
      triggerMeta.source,
      triggerMeta.triggerPropertyName,
    );
    return;
  }
  navigator.geolocation.clearWatch(watchId);
  watchId = undefined;
  if (successChannel) {
    successChannel.close();
  }
  if (errorChannel) {
    errorChannel.close();
  }
}
