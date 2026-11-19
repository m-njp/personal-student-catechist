import { activityRegistry } from "@/core/activity/ActivityRegistry";
import { JourneyActivity } from "./JourneyActivity";
import { JourneyView } from "./JourneyView";

activityRegistry.register<JourneyActivity>(JourneyActivity.TYPE, JourneyView);
