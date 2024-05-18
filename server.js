const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const xmlrpc = require("xmlrpc");
const { url, db, username, password } = require("./config");

// Create an Express app
const app = express();
app.use(bodyParser.json());

// Connect to Odoo
const common = xmlrpc.createClient({ url: `${url}/xmlrpc/2/common` });
const object = xmlrpc.createClient({ url: `${url}/xmlrpc/2/object` });

common.methodCall("authenticate", [db, username, password, {}], (err, uid) => {
  if (err) {
    console.error("Failed to authenticate:", err);
    return;
  }

  console.log("Authenticated with UID:", uid);

  // Function to get state and city from pincode
  async function getStateAndCityByPincode(pincode) {
    try {
      const response = await axios.get(
        `https://api.postalpincode.in/pincode/${pincode}`
      );
      if (
        response.data &&
        response.data[0] &&
        response.data[0].Status === "Success"
      ) {
        const postOffice = response.data[0].PostOffice[0];
        return {
          state: postOffice.State,
          city: postOffice.District,
        };
      } else {
        throw new Error("Invalid response from pincode API");
      }
    } catch (error) {
      console.error("Failed to fetch state and city:", error);
      throw error;
    }
  }

  // Function to get the state ID based on the state name
  function getStateIdByName(stateName, countryId, callback) {
    const domain = [
      ["name", "=", stateName],
      ["country_id", "=", countryId],
    ];
    object.methodCall(
      "execute_kw",
      [db, uid, password, "res.country.state", "search", [domain]],
      (err, stateIds) => {
        if (err) {
          console.error("Failed to fetch state ID:", err);
          callback(err, null);
        } else if (stateIds.length === 0) {
          console.error("No state found with the given name");
          callback(new Error("No state found with the given name"), null);
        } else {
          callback(null, stateIds[0]);
        }
      }
    );
  }

  // Function to get the country ID based on the country name
  function getCountryIdByName(countryName, callback) {
    const domain = [["name", "=", countryName]];
    object.methodCall(
      "execute_kw",
      [db, uid, password, "res.country", "search", [domain]],
      (err, countryIds) => {
        if (err) {
          console.error("Failed to fetch country ID:", err);
          callback(err, null);
        } else if (countryIds.length === 0) {
          console.error("No country found with the given name");
          callback(new Error("No country found with the given name"), null);
        } else {
          callback(null, countryIds[0]);
        }
      }
    );
  }

  // Function to get the sales team ID based on the sales team name
  function getSalesTeamIdByName(salesTeamName, callback) {
    const domain = [["name", "=", salesTeamName]];
    object.methodCall(
      "execute_kw",
      [db, uid, password, "crm.team", "search", [domain]],
      (err, teamIds) => {
        if (err) {
          console.error("Failed to fetch sales team ID:", err);
          callback(err, null);
        } else if (teamIds.length === 0) {
          console.error("No sales team found with the given name");
          callback(new Error("No sales team found with the given name"), null);
        } else {
          callback(null, teamIds[0]);
        }
      }
    );
  }

  // Function to get the campaign ID based on the campaign name
  function getCampaignIdByName(campaignName, callback) {
    const domain = [["name", "=", campaignName]];
    object.methodCall(
      "execute_kw",
      [db, uid, password, "utm.campaign", "search", [domain]],
      (err, campaignIds) => {
        if (err) {
          console.error("Failed to fetch campaign ID:", err);
          callback(err, null);
        } else if (campaignIds.length === 0) {
          console.error("No campaign found with the given name");
          callback(new Error("No campaign found with the given name"), null);
        } else {
          callback(null, campaignIds[0]);
        }
      }
    );
  }

  // Function to get the medium ID based on the medium name
  function getMediumIdByName(mediumName, callback) {
    const domain = [["name", "=", mediumName]];
    object.methodCall(
      "execute_kw",
      [db, uid, password, "utm.medium", "search", [domain]],
      (err, mediumIds) => {
        if (err) {
          console.error("Failed to fetch medium ID:", err);
          callback(err, null);
        } else if (mediumIds.length === 0) {
          console.error("No medium found with the given name");
          callback(new Error("No medium found with the given name"), null);
        } else {
          callback(null, mediumIds[0]);
        }
      }
    );
  }

  // Function to get the source ID based on the source name
  function getSourceIdByName(sourceName, callback) {
    const domain = [["name", "=", sourceName]];
    object.methodCall(
      "execute_kw",
      [db, uid, password, "utm.source", "search", [domain]],
      (err, sourceIds) => {
        if (err) {
          console.error("Failed to fetch source ID:", err);
          callback(err, null);
        } else if (sourceIds.length === 0) {
          console.error("No source found with the given name");
          callback(new Error("No source found with the given name"), null);
        } else {
          callback(null, sourceIds[0]);
        }
      }
    );
  }

  // Function to create a lead
  async function createLead(
    data,
    sourceName,
    mediumName,
    salesTeamName,
    leadName,
    campaignName,
    res
  ) {
    try {
      // Get state and city from pincode for Test Ride
      if (leadName === "Test Ride Enquiry - Unassigned") {
        const location = await getStateAndCityByPincode(data.zip);
        data.state = location.state;
        data.city = location.city;
      }

      // Get the country ID first
      const countryId = await new Promise((resolve, reject) => {
        getCountryIdByName(data.country, (err, result) => {
          if (err) reject(err);
          else resolve(result);
        });
      });

      // Get the state ID based on the country ID
      const stateId = await new Promise((resolve, reject) => {
        getStateIdByName(data.state, countryId, (err, result) => {
          if (err) reject(err);
          else resolve(result);
        });
      });

      // Get the sales team ID based on the sales team name
      const teamId = await new Promise((resolve, reject) => {
        getSalesTeamIdByName(salesTeamName, (err, result) => {
          if (err) reject(err);
          else resolve(result);
        });
      });

      // Get the source ID based on the source name
      const sourceId = await new Promise((resolve, reject) => {
        getSourceIdByName(sourceName, (err, result) => {
          if (err) reject(err);
          else resolve(result);
        });
      });

      // Get the medium ID based on the medium name
      const mediumId = await new Promise((resolve, reject) => {
        getMediumIdByName(mediumName, (err, result) => {
          if (err) reject(err);
          else resolve(result);
        });
      });

      // Get the campaign ID based on the campaign name (if provided)
      let campaignId = null;
      if (campaignName) {
        campaignId = await new Promise((resolve, reject) => {
          getCampaignIdByName(campaignName, (err, result) => {
            if (err) reject(err);
            else resolve(result);
          });
        });
      }

      // Construct the lead data
      const leadData = {
        name: leadName,
        contact_name: data.contact_name,
        title: data.title, // Include title in lead data
        city: data.city,
        zip: data.zip,
        state_id: stateId,
        country_id: countryId,
        mobile: data.mobile,
        phone: data.phone,
        team_id: teamId,
        email_from: data.email,
        source_id: sourceId,
        medium_id: mediumId,
        user_id: false, // Explicitly keep the lead unassigned
      };

      // Add custom section fields for LinkedIn leads
      if (leadName === "Dealership Enquiry - Unassigned") {
        leadData.x_studio_state_name_1 = stateId;
        leadData.x_studio_city = data.city;
        leadData.x_studio_zip_code = data.zip_code;
      }

      // Add campaign ID if provided
      if (campaignId) {
        leadData.campaign_id = campaignId;
      }

      // Create the lead in Odoo
      object.methodCall(
        "execute_kw",
        [db, uid, password, "crm.lead", "create", [leadData]],
        (err, leadId) => {
          if (err) {
            console.error("Failed to create lead:", err);
            res.status(500).json({ error: "Failed to create lead" });
            return;
          }

          res.json({ lead_id: leadId });
        }
      );
    } catch (error) {
      console.error("Error creating lead:", error);
      res.status(500).json({ error: "Error creating lead" });
    }
  }

  // Define the endpoint to create a lead (previously LinkedIn)
  app.post("/create_lead", (req, res) => {
    const data = req.body;
    createLead(
      data,
      data.source_name,
      data.medium_name,
      "B2C (Dealership Expansion)",
      "Dealership Enquiry - Unassigned",
      null,
      res
    ); // Source and Medium from request
  });

  // Define the endpoint to create a lead from Facebook
  app.post("/create_lead_facebook", (req, res) => {
    const data = req.body;
    createLead(
      data,
      data.source_name,
      data.medium_name,
      "B2C (Dealership Expansion)",
      "Dealership Enquiry - Unassigned - FB",
      data.campaign_name,
      res
    ); // Source, Medium, and Campaign from request
  });

  // Define the endpoint to create a lead from Test Ride
  app.post("/create_lead_testride", (req, res) => {
    const data = req.body;
    createLead(
      data,
      data.source_name,
      data.medium_name,
      "Test Ride Group",
      data.lead_name, // Accept leadName from request body
      null,
      res
    ); // Source and Medium from request
  });

  // Start the server
  app.listen(3000, () => {
    console.log("Server is running on port 3000");
  });
});
