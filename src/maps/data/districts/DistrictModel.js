export class DistrictModel {
  constructor({ id, name, boundary, progress = 0 }) {
    this.id = id;
    this.name = name;
    this.boundary = boundary;
    this.progress = progress;
    this.exploredMeters = 0;
    this.totalMeters = 0;
  }
}