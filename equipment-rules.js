/*
 GearCashOut equipment rules foundation.
 This file defines the question rules without changing the existing quote workflow.
 Future categories can be added here or moved into a database table.
*/
(function () {
  "use strict";

  window.gearCashOutEquipmentRules = {
    equipmentTypes: {
      drone: {
        label: "Drone",
        used: {
          show: ["package", "batteries", "flightHours", "binding", "serial", "photos"]
        },
        newSealed: {
          show: ["package", "serialIfAvailable", "photos"],
          skip: ["flightHours", "batteryCycles", "binding", "damage"]
        }
      },
      controller: {
        label: "Controller",
        used: {
          show: ["manufacturer", "model", "condition", "compatibility", "serialIfAvailable", "photos"],
          skip: ["flightHours", "batteryCycles"]
        },
        newSealed: {
          show: ["manufacturer", "model", "photos", "serialIfAvailable"]
        }
      },
      charger: {
        label: "Charger / Charging Equipment",
        used: {
          show: ["manufacturer", "model", "condition", "photos"]
        },
        newSealed: {
          show: ["manufacturer", "model", "photos", "serialIfAvailable"]
        }
      },
      camera: {
        label: "Camera Equipment",
        used: {
          show: ["manufacturer", "model", "condition", "usageCountIfAvailable", "serialIfAvailable", "photos"]
        },
        newSealed: {
          show: ["manufacturer", "model", "photos", "serialIfAvailable"]
        }
      },
      dronePart: {
        label: "Drone Equipment / Parts",
        used: {
          show: ["componentType", "compatibleModel", "condition", "faultDescription", "photos"]
        },
        newSealed: {
          show: ["componentType", "compatibleModel", "photos"]
        }
      },
      accessory: {
        label: "Accessory",
        used: {
          show: ["manufacturer", "model", "condition", "photos"]
        },
        newSealed: {
          show: ["manufacturer", "model", "photos"]
        }
      }
    }
  };
})();
