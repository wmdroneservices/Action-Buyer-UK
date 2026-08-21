/**
 * GearCashOut - Package Specifications
 *
 * Single source of truth for expected package contents. Keep package rules
 * here rather than duplicating them across quote, inventory and resale pages.
 */

const PACKAGE_SPECIFICATIONS = Object.freeze({
  "DJI Mini 4 Pro|Standard": {
    model: "DJI Mini 4 Pro",
    package: "Standard",
    expectedBatteries: 1,
    expectedContents: ["Aircraft", "Remote controller", "1 battery", "Charger/cable"]
  },
  "DJI Mini 4 Pro|Fly More Combo": {
    model: "DJI Mini 4 Pro",
    package: "Fly More Combo",
    expectedBatteries: 3,
    expectedContents: ["Aircraft", "Remote controller", "3 batteries", "Charging hub", "Carry case", "Charger/cables"]
  },
  "DJI Avata|Fly Smart Combo": {
    model: "DJI Avata",
    package: "Fly Smart Combo",
    expectedBatteries: 1,
    expectedContents: ["Aircraft", "Motion/remote controller", "1 battery", "Charger/cable"]
  },
  "DJI Avata|Fly More Combo": {
    model: "DJI Avata",
    package: "Fly More Combo",
    expectedBatteries: 2,
    expectedContents: ["Aircraft", "Controller", "2 batteries", "Charging hub", "Carry case", "Charger/cables"]
  }
});

function getPackageSpecification(model, packageName) {
  return PACKAGE_SPECIFICATIONS[`${model}|${packageName}`] || null;
}

function getExpectedBatteryCount(model, packageName) {
  return getPackageSpecification(model, packageName)?.expectedBatteries ?? null;
}

function validatePackageBatteryCount(model, packageName, actualBatteryCount) {
  const expected = getExpectedBatteryCount(model, packageName);
  if (expected === null) return { knownPackage: false, valid: false, expected: null, actual: Number(actualBatteryCount) || 0 };
  const actual = Number(actualBatteryCount) || 0;
  return { knownPackage: true, valid: actual === expected, expected, actual };
}

function getPackageReadiness(model, packageName, actualBatteryCount, checkedContents = []) {
  const specification = getPackageSpecification(model, packageName);
  if (!specification) return { knownPackage: false, ready: false, reason: "No package specification exists for this model/package." };

  const battery = validatePackageBatteryCount(model, packageName, actualBatteryCount);
  const missingContents = specification.expectedContents.filter(item => !checkedContents.includes(item));

  return {
    knownPackage: true,
    ready: battery.valid && missingContents.length === 0,
    expectedBatteries: specification.expectedBatteries,
    actualBatteries: battery.actual,
    missingContents
  };
}

if (typeof window !== "undefined") window.PackageSpecifications = {
  PACKAGE_SPECIFICATIONS,
  getPackageSpecification,
  getExpectedBatteryCount,
  validatePackageBatteryCount,
  getPackageReadiness
};

if (typeof module !== "undefined") module.exports = {
  PACKAGE_SPECIFICATIONS,
  getPackageSpecification,
  getExpectedBatteryCount,
  validatePackageBatteryCount,
  getPackageReadiness
};
