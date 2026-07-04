import { DistrictModel } from "./DistrictModel";
export const yerevanDistricts = [
  new DistrictModel({
  id: "center",
  name: "Center",
  progress: 80,
  boundary: [
    { latitude: 40.195, longitude: 44.495 },
    { latitude: 40.195, longitude: 44.535 },
    { latitude: 40.165, longitude: 44.545 },
    { latitude: 40.155, longitude: 44.505 },
  ],
}),
new DistrictModel({
  id: "avan",
  name: "Avan",
  progress: 35,
  boundary: [
    { latitude: 40.225, longitude: 44.535 },
    { latitude: 40.225, longitude: 44.585 },
    { latitude: 40.190, longitude: 44.590 },
    { latitude: 40.185, longitude: 44.545 },
  ],
}),
];