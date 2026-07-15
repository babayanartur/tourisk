import { getDiscoveryById } from "./discoveries";
import { getHiddenDiscoveryById } from "./hiddenDiscoveries";

export function getAnyDiscoveryById(id) {
  return (
    getDiscoveryById(id) ||
    getHiddenDiscoveryById(id) ||
    null
  );
}