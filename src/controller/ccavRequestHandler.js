import https from 'https'; // Use the 'https' module for secure connections
import { encrypt } from '../middlewares/ccavutil.js';
import qs from 'querystring';
import { model } from 'mongoose';
import StoreFeature from "../models/StoreFeature.js";
// merchant_id:	3299875

export async function postReq(request, response) {
    let body = '';  
    const master = await StoreFeature.findOne({});
    // const workingKey = 'C5CFD3B69271F983E81D60E47B6135E7';
    // const accessCode = 'AVVR62LB98BN31RVNB';
    const workingKey = master.ccKey;
    const accessCode = master.ccSolt;
    let encRequest = '';
    let formbody = '';

    request.on('data', function (data) {
        body += data;
    });

    request.on('end', function () {
        encRequest = encrypt(body, workingKey);
        formbody = `<form id="nonseamless" method="post" name="redirect" action="https://secure.ccavenue.com/transaction/transaction.do?command=initiateTransaction"/> <input type="hidden" id="encRequest" name="encRequest" value="${encRequest}"><input type="hidden" name="access_code" id="access_code" value="${accessCode}"><script language="javascript">document.redirect.submit();</script></form>`;
        response.writeHead(200, { 'Content-Type': 'text/html' });
        response.write(formbody);
        response.end();
    });
    // request.on('end', function () {
    //     encRequest = encrypt(body, workingKey);
    //     formbody = `<form id="nonseamless" method="post" name="redirect" action="https://test.ccavenue.com/transaction/transaction.do?command=initiateTransaction"/> <input type="hidden" id="encRequest" name="encRequest" value="${encRequest}"><input type="hidden" name="access_code" id="access_code" value="${accessCode}"><script language="javascript">document.redirect.submit();</script></form>`;
    //     response.writeHead(200, { 'Content-Type': 'text/html' });
    //     response.write(formbody);
    //     response.end();
    // });


    request.on('error', function (error) {
        console.error('Error processing request:', error);
        response.writeHead(500, { 'Content-Type': 'text/plain' });
        response.end('Internal Server Error');
    });
}
