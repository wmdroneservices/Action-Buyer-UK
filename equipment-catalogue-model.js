// Equipment catalogue model
// Database-ready structure for dynamic dropdown categories.
// New manufacturers, equipment types and accessories can be added as records.

const equipmentCatalogue = {
  categories: [
    {
      id: "drone",
      name: "Drone",
      questions: ["condition", "model", "serial", "photos", "flight_hours", "battery_cycles", "binding_status"]
    },
    {
      id: "controller",
      name: "Controller",
      questions: ["condition", "model", "serial", "photos"]
    },
    {
      id: "charger",
      name: "Charger",
      questions: ["condition", "model", "photos"]
    },
    {
      id: "camera",
      name: "Camera",
      questions: ["condition", "model", "serial", "photos"]
    },
    {
      id: "drone_part",
      name: "Drone Replacement Part",
      questions: ["condition", "model", "photos"]
    },
    {
      id: "accessory",
      name: "Accessory",
      questions: ["condition", "photos"]
    }
  ],

  manufacturers: [
    "DJI",
    "Autel Robotics",
    "Parrot",
    "Skydio",
    "Yuneec",
    "Tamiya",
    "Potensic"
  ]
};

export default equipmentCatalogue;
