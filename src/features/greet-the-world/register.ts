import { activityRegistry } from "@/core/activity/ActivityRegistry";
import { GreetActivity } from "./GreetActivity";
import { GreetView } from "./GreetView";

activityRegistry.register<GreetActivity>(GreetActivity.TYPE, GreetView);
