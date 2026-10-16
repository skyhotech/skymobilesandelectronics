# APX inventory report

Open **Inventory** in the management sidebar. Opening the page or choosing Refresh
calls owner-only `GET /api/v1/management/inventory/`; Django makes one server-side
`POST http://10.10.2.50:8080/api/Report/ClosingStockBreakupReport`.
The page displays APX's report columns, searches all returned rows without regard
to case, and paginates locally at 100 rows. It does not update local Stock records.
APX group/total rows are retained as report rows; no inventory totals are invented.

## Server configuration needed

Set these in the backend's private environment, then restart the backend:

```dotenv
APX_API_BASE_URL=http://10.10.2.50:8080
APX_USER_ID=
APX_SECURITY_CODE=
APX_CLOSING_STOCK_BODY=
```

Obtain the authorized integration UserId/SecurityCode and a successful JSON request
from APX's administrator. Do not use browser credentials or guess database/branch
scope. APX_CLOSING_STOCK_BODY must contain the approved JSON object as one line.
No credentials, database name, branch identity or date values have been invented.
Do not put these settings in NEXT_PUBLIC variables or commit the private .env file.
Header UserId is distinct from the body UserInternalCode unless APX confirms otherwise.

## Recovered input contract

Reflection-only metadata inspection of supplied `D:/APX-Api/bin/APXWebAPI.dll` and
its dependencies identifies `APXWebLibDataProvider.Models.Reports.ClosingStockBreakup_Report_Inputs`.
Property spelling is preserved exactly below, including the vendor's spellings:

| Properties | .NET type |
| --- | --- |
| DBName, BranchInternalCode, UserInternalCode | String |
| BranchCodeList, BrandCodeList, ProductCodeList | String |
| ProductcatgoryCodeList, ItemModelCatgoryCodelist, ItemModelCodelist | String |
| ItemClassficationTypeCodeList, ItemClassficationCodeList, ScaleCodeList | String |
| RemoveColumns | String |
| AsOnDate, PurchaseFrom | Int64 |
| ShowIMEINo, OrderByItemModelCode, DownloadReport, HideUnwantedData | Boolean |

Metadata establishes names/types, not requiredness, default values, list delimiters,
date units/time zone or authorized database/branch/user values. Confirm these with
APX before supplying the JSON. Django forces DownloadReport=false for table output.

The supplied APX web client (`D:/APX-w/Scripts/APXScripts/jsReports.js`, function
ClosingStockBreakupReportApiCall) supplies UserId/SecurityCode headers. It checks
StatusCode==0 and StatusMessage==Success, then treats the first Data row as column
headings. The adapter supports dictionary and array rows, removes columns marked
hidden and known layout metadata, and returns plain strings rendered as escaped text.

## Limits and verification

Only owners can read the endpoint. Scope/body/credentials are fixed server-side;
browser query parameters cannot change the upstream URL or report scope. Responses
are not cached, redirects are not followed, POST is not retried automatically,
timeout is 15 seconds, response size is capped at 8 MiB and reports at 10,000 data
rows/100 columns. Larger reports require a narrower approved server-side scope.
Vendor diagnostics and credentials are not forwarded to browser errors. Downloads
are rejected rather than following arbitrary ReferenceInfo URLs.

The live endpoint was reachable during development, but an unauthenticated empty
JSON request returned HTTP 200 with StatusCode=201, StatusMessage=Failed and Data=null.
No successful authenticated stock fetch has been verified. Existing backend .env
had no APX settings. Until configured, the page reports that inventory is not connected.
Successful/empty/failure table rendering and proxy behavior are tested with labeled
test fixtures/mocks; these are not live stock. No APX sales or stock mutations occur.
