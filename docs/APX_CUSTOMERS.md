# APX customer lookup

The **Customers** sidebar tab opens `/management/admin/customers`. Enter a mobile
number and choose Find customer. No broad customer download occurs on page entry.

The owner-only Django endpoint `POST /api/v1/management/customers/lookup/` accepts
`{"mobile":"<CUSTOMER_MOBILE>"}` and makes this upstream request:

```text
GET http://10.10.2.50:8080/api/apxapi/GetCustomerList?CompanyCode=<SERVER_COMPANY_CODE>&MobileNo=<CUSTOMER_MOBILE>
```

Configure backend private environment values `APX_COMPANY_CODE`, `APX_USER_ID` and
`APX_SECURITY_CODE`; `APX_API_BASE_URL` defaults to the supplied private host. Reuse
the approved APX integration account and confirm company scope with its administrator.
Restart Django after configuration. No company or credentials are guessed or exposed
to frontend environment variables. A browser cannot override company or API URL.

Local POST avoids placing mobile numbers in local browser URLs and access-log query
strings. APX necessarily receives MobileNo in its own GET query. Mobile inputs accept
7–15 digits with an optional leading +, with no guessed country-code conversion.
Owner authorization and CSRF remain required. Responses use no-store; lookup results
are cleared on input change/Clear and mutation cache retention is zero after unmount.
This lookup does not authenticate customers, create accounts or import customer data.

The adapter expects APX's StatusCode/StatusMessage/Data envelope and flat customer
objects in Data. NoRecordFoundSuccess yields an empty result. Nonzero business status,
invalid response shape and transport errors show a safe error. Password, secret,
token and SecurityCode fields are excluded. Values render as escaped text. Credentials
and upstream diagnostics are not returned to the browser. Requests time out at 15
seconds, redirects are blocked, response size is limited to 1 MiB and results to
200 records/100 columns. This is not a general-purpose APX proxy.

Verified with backend transport/permission/CSRF tests and browser fixtures, including
mobile validation, result rendering, clearing, empty state and responsive widths.
No live customer record was queried: a valid company/integration account and an
authenticated response sample are still required to confirm the live response contract.
