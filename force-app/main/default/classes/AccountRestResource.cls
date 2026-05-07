@RestResource(urlMapping='/account_data')
global class AccountRestResource {

    // ----------------- GET Method -------------------
    @HttpGet
    global static void getAccountDetails() {
        RestRequest req = RestContext.request;
        RestResponse res = RestContext.response;

        String accountId = req.params.get('accountId');

        if (String.isBlank(accountId)) {
            res.statusCode = 400;
            res.responseBody = Blob.valueOf(JSON.serialize(new ErrorWrapper('Missing or invalid accountId')));
            return;
        }

        try {
            Account acc = [
                SELECT Id, Name, Industry, Phone, Email__c, AnnualRevenue, Active__c,
                    (SELECT Id, Name, StageName FROM Opportunities ORDER BY CreatedDate DESC LIMIT 1),
                    (SELECT Id, FirstName, LastName, Email FROM Contacts)
                FROM Account
                WHERE Id = :accountId
                LIMIT 1
            ];

            // Opportunity (only latest one)
            String oppJson = 'null';
            if (!acc.Opportunities.isEmpty()) {
                oppJson = JSON.serialize(new OpportunityWrapper(acc.Opportunities[0]));
            }

            // Contacts
            List<ContactWrapper> contactList = new List<ContactWrapper>();
            for (Contact con : acc.Contacts) {
                contactList.add(new ContactWrapper(con));
            }

            // Final JSON
            String jsonResult = '{' +
                '"id":"' + acc.Id + '",' +
                '"name":"' + acc.Name + '",' +
                '"industry":"' + acc.Industry + '",' +
                '"Phone":"' + acc.Phone + '",' +
                '"Email__c":"' + acc.Email__c + '",' +
                '"AnnualRevenue":"' + acc.AnnualRevenue + '",' +
                '"Active__c":"' + acc.Active__c + '",' +
                '"opportunity":' + oppJson + ',' +
                '"contacts":' + JSON.serialize(contactList) +
            '}';

            res.statusCode = 200;
            res.responseBody = Blob.valueOf(jsonResult);

        } catch (Exception e) {
            res.statusCode = 500;
            res.responseBody = Blob.valueOf(JSON.serialize(new ErrorWrapper('Server Error: ' + e.getMessage())));
        }
    }

    // ----------------- POST Method -------------------
    @HttpPost
    global static void createAccountWithChildren() {
        RestRequest req = RestContext.request;
        RestResponse res = RestContext.response;

        try {
            // Parse JSON body
            String body = req.requestBody.toString();
            Map<String, Object> data = (Map<String, Object>) JSON.deserializeUntyped(body);

            // Validate & assign Account fields
            String name = (String) data.get('name');
            if (String.isBlank(name)) {
                res.statusCode = 400;
                res.responseBody = Blob.valueOf(JSON.serialize(new ErrorWrapper('Missing required field: name')));
                return;
            }

            Account acc = new Account();
            acc.Name = name;
            acc.Industry = (String) data.get('industry');
            acc.Phone = (String) data.get('phone');
            acc.Email__c = (String) data.get('email__c');
            acc.AnnualRevenue = (data.containsKey('annualRevenue')) ? (Decimal) data.get('annualRevenue') : null;
            acc.Active__c = (String) data.get('active__c');
            insert acc;

            // Create Opportunity if present
            if (data.containsKey('opportunity')) {
                Map<String, Object> oppData = (Map<String, Object>) data.get('opportunity');
                Opportunity opp = new Opportunity();
                opp.Name = (String) oppData.get('name');
                opp.StageName = (String) oppData.get('stage');
                opp.CloseDate = Date.today().addDays(30); // Default
                opp.AccountId = acc.Id;
                insert opp;
            }

            // Create Contacts if any
            List<Contact> contactsToInsert = new List<Contact>();
            if (data.containsKey('contacts')) {
                List<Object> contacts = (List<Object>) data.get('contacts');
                for (Object obj : contacts) {
                    Map<String, Object> conMap = (Map<String, Object>) obj;
                    Contact con = new Contact();
                    con.FirstName = (String) conMap.get('firstName');
                    con.LastName = (String) conMap.get('lastName');
                    con.Email = (String) conMap.get('email');
                    con.AccountId = acc.Id;
                    contactsToInsert.add(con);
                }
                if (!contactsToInsert.isEmpty()) {
                    insert contactsToInsert;
                }
            }

            // Response
            Map<String, Object> result = new Map<String, Object>{
                'message' => 'Account, Opportunity, and Contacts created successfully',
                'accountId' => acc.Id
            };
            res.statusCode = 201;
            res.responseBody = Blob.valueOf(JSON.serialize(result));

        } catch (Exception e) {
            res.statusCode = 500;
            res.responseBody = Blob.valueOf(JSON.serialize(new ErrorWrapper('Error creating records: ' + e.getMessage())));
        }
    }

    // ----------------- Wrapper Classes -------------------
    global class OpportunityWrapper {
        public String id;
        public String name;
        public String stage;

        public OpportunityWrapper(Opportunity opp) {
            this.id = opp.Id;
            this.name = opp.Name;
            this.stage = opp.StageName;
        }
    }

    global class ContactWrapper {
        public String id;
        public String firstName;
        public String lastName;
        public String email;

        public ContactWrapper(Contact con) {
            this.id = con.Id;
            this.firstName = con.FirstName;
            this.lastName = con.LastName;
            this.email = con.Email;
        }
    }

    global class ErrorWrapper {
        public String message;
        public ErrorWrapper(String msg) {
            this.message = msg;
        }
    }
}