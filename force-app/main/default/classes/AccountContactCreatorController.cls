public with sharing class AccountContactCreatorController {
    
    @AuraEnabled
    public static Id createAccountContactWithFile(
        String accountName,
        String accountWebsite,
        String contactFirstName,
        String contactLastName,
        String contactEmail,
        String contactPhone,
        String fileName,
        String fileData,
        String fileContentType
    ) {
        try {
            // Validate required fields
            if (String.isBlank(accountName)) {
                throw new AuraHandledException('Account Name is required');
            }
            if (String.isBlank(contactFirstName) || String.isBlank(contactLastName)) {
                throw new AuraHandledException('Contact First Name and Last Name are required');
            }
            if (String.isBlank(contactEmail)) {
                throw new AuraHandledException('Contact Email is required');
            }

            // Create Account
            Account acc = new Account(
                Name = accountName,
                Website = accountWebsite
            );
            insert acc;

            // Create Contact
            Contact con = new Contact(
                FirstName = contactFirstName,
                LastName = contactLastName,
                Email = contactEmail,
                Phone = contactPhone,
                AccountId = acc.Id
            );
            insert con;

            // Upload file if provided
            if (!String.isBlank(fileName) && !String.isBlank(fileData)) {
                ContentVersion cv = new ContentVersion();
                cv.Title = fileName;
                cv.PathOnClient = fileName;
                cv.VersionData = EncodingUtil.base64Decode(fileData);
                cv.FirstPublishLocationId = con.Id;
                cv.IsMajorVersion = true;
                insert cv;
            }

            return con.Id;

        } catch (DmlException e) {
            throw new AuraHandledException('Database Error: ' + e.getMessage());
        } catch (Exception e) {
            throw new AuraHandledException('Error: ' + e.getMessage());
        }
    }
}