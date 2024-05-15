// server.js
const express = require("express");
const bodyParser = require("body-parser");
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

  // Define the endpoint to create a lead
  app.post("/create_lead", (req, res) => {
    const data = req.body;

    // Get the country ID first
    getCountryIdByName(data.country, (err, countryId) => {
      if (err) {
        res.status(500).json({ error: "Failed to fetch country ID" });
        return;
      }

      // Get the state ID based on the country ID
      getStateIdByName(data.state, countryId, (err, stateId) => {
        if (err) {
          res.status(500).json({ error: "Failed to fetch state ID" });
          return;
        }

        // Get the sales team ID based on the sales team name
        getSalesTeamIdByName(data.sales_team, (err, teamId) => {
          if (err) {
            res.status(500).json({ error: "Failed to fetch sales team ID" });
            return;
          }

          // Construct the lead data object with additional fields
          const leadData = {
            name: "Dealership Enquiry - Unassigned",
            contact_name: data.contact_name, // Add contact name
            city: data.city,
            zip: data.zip,
            state_id: stateId,
            country_id: countryId,
            mobile: data.mobile,
            phone: data.phone,
            team_id: teamId,
            email_from: data.email,
            source_id: 6, // ID for LinkedIn source, replace with actual ID
            medium_id: 3, // ID for Direct medium, replace with actual ID
            user_id: false, // Explicitly keep the lead unassigned
          };

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
        });
      });
    });
  });

  // Start the server
  app.listen(3000, () => {
    console.log("Server is running on port 3000");
  });
});
