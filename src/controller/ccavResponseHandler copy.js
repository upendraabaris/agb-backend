import http from "http";
import fs from "fs";
import { decrypt } from "../middlewares/ccavutil.js";
import { parse } from "querystring";

export function postRes(request, response) {
  var ccavEncResponse = "",
    ccavResponse = "",
    workingKey = "6409B5850CBA12A36D5623813C800449", //Put in the 32-Bit key shared by CCAvenues.
    ccavPOST = "";

  request.on("data", function (data) {
    ccavEncResponse += data;
    ccavPOST = parse(ccavEncResponse);
    var encryption = ccavPOST.encResp;
    ccavResponse = decrypt(encryption, workingKey);
  });

  request.on("end", function () {
	
    // Function to convert the response string to a JSON object
    function convertResponseToJSON(responseString) {
      // Split the response string into key-value pairs
      const keyValuePairs = responseString.split("&");

      // Initialize an empty object to store key-value pairs
      const result = {};

      // Iterate through key-value pairs and populate the result object
      keyValuePairs.forEach((pair) => {
        const [key, value] = pair.split("=");
        result[key] = decodeURIComponent(value.replace(/\+/g, " "));
      });

      return result;
    }

    // Convert the response string to a JSON object
    const jsonResponse = convertResponseToJSON(ccavResponse);
	// console.log("jsonResponse",jsonResponse);
    var pData = "";
    pData = "<table border=1 cellspacing=2 cellpadding=2><tr><td>";
    pData = pData + ccavResponse.replace(/=/gi, "</td><td>");
    pData = pData.replace(/&/gi, "</td></tr><tr><td>");
    pData = pData + "</td></tr></table>";
    var htmlcode =
      '<html><head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"><title>Response Handler</title></head><body><center><font size="4" color="blue"><b>Response Page</b></font><br>' +
      pData +
      "</center><br></body></html>";
    response.writeHeader(200, { "Content-Type": "text/html" });
    response.write(htmlcode);
    response.end();
  });
}
