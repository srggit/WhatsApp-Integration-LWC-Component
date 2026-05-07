public with sharing class DepartmentController {
    
    @AuraEnabled
    public static String saveDepartment(String departmentName, String departmentHeadId, 
                                       String teamName, Integer noOfMembers, String region) {
        try {
            if (String.isBlank(departmentName)) {
                throw new AuraHandledException('Department Name is required');
            }
            if (String.isBlank(departmentHeadId)) {
                throw new AuraHandledException('Department Head is required');
            }
            if (String.isBlank(teamName)) {
                throw new AuraHandledException('Team Name is required');
            }
            if (noOfMembers == null || noOfMembers < 1) {
                throw new AuraHandledException('Number of Members must be at least 1');
            }
            if (String.isBlank(region)) {
                throw new AuraHandledException('Region is required');
            }

            List<Department__c> existingDepts = [SELECT Id FROM Department__c WHERE Name = :departmentName LIMIT 1];
            if (!existingDepts.isEmpty()) {
                throw new AuraHandledException('Department with this name already exists');
            }
            
            Department__c newDepartment = new Department__c();
            newDepartment.Name = departmentName;
            newDepartment.User__c = departmentHeadId; 
            newDepartment.Team_Name__c = teamName;
            newDepartment.No_of_Member__c = noOfMembers;
            newDepartment.Region__c = region;
            
            insert newDepartment;
            
            return newDepartment.Id;
            
        } catch (DmlException e) {
            System.debug('DML Exception: ' + e.getMessage());
            throw new AuraHandledException('Database error: ' + e.getDmlMessage(0));
        } catch (Exception e) {
            System.debug('Exception: ' + e.getMessage());
            throw new AuraHandledException('Error creating department: ' + e.getMessage());
        }
    }
    
    @AuraEnabled(cacheable=true)
    public static List<User> getUsersList() {
        try {
            return [SELECT Id, Name
                   FROM User 
                   WHERE IsActive = true   AND UserType IN ('Standard','StandardPerson')
                   ORDER BY Name 
                   LIMIT 1000];
        } catch (Exception e) {
            System.debug('Exception fetching users: ' + e.getMessage());
            throw new AuraHandledException('Error fetching users: ' + e.getMessage());
        }
    }
    
    @AuraEnabled(cacheable=true) 
    public static Department__c getDepartmentById(String departmentId) {
        try {
            return [SELECT Id, Name, User__c, Team_Name__c, No_of_Member__c, Region__c
                   FROM Department__c 
                   WHERE Id = :departmentId 
                   LIMIT 1];
        } catch (Exception e) {
            System.debug('Exception fetching department: ' + e.getMessage());
            throw new AuraHandledException('Error fetching department: ' + e.getMessage());
        }
    }
}