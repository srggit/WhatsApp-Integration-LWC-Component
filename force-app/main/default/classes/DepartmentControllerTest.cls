@isTest
public class DepartmentControllerTest {

    @testSetup
    static void setupData() {
        Profile p = [SELECT Id FROM Profile WHERE Name = 'Standard User' LIMIT 1];
        User testUser = new User(
            FirstName = 'Test',
            LastName = 'User',
            Alias = 'tuser',
            Email = 'testuser@example.com',
            Username = 'testuser' + DateTime.now().getTime() + '@example.com',
            ProfileId = p.Id,
            TimeZoneSidKey = 'Asia/Kolkata',
            LocaleSidKey = 'en_US',
            EmailEncodingKey = 'UTF-8',
            LanguageLocaleKey = 'en_US'
        );
        insert testUser;
        Department__c dept = new Department__c(
            Name = 'Test team',
            User__c = testUser.Id,
            No_of_Member__c = 10,
            Team_Name__c = 'test team',
            Region__c = 'Bangalore'
        );
        insert dept;
    }
    
    @isTest
    static void testHappyPath() {
        Department__c dept = [SELECT Id, Name, User__c, No_of_Member__c, Team_Name__c, Region__c FROM Department__c LIMIT 1];
        Department__c result = DepartmentController.getDepartmentById(dept.Id);
        List<User> users = DepartmentController.getUsersList();
        String newDeptId = DepartmentController.saveDepartment(
            'Developer Dept',
            String.valueOf(dept.User__c),
            dept.Team_Name__c,
            Integer.valueOf(dept.No_of_Member__c),
            dept.Region__c
        );
    }

    @isTest
    static void testSaveDepartment_ValidationErrors() {
        Department__c dept = [SELECT Id, Name, User__c, No_of_Member__c, Team_Name__c, Region__c FROM Department__c LIMIT 1];
        Boolean failed;
      
        failed = false;
        try {
            DepartmentController.saveDepartment(
                '', String.valueOf(dept.User__c), dept.Team_Name__c, Integer.valueOf(dept.No_of_Member__c), dept.Region__c
            );
        } catch (Exception e) {
            failed = true;
        }
    
        
        // Blank departmentHeadId
        failed = false;
        try {
            DepartmentController.saveDepartment(
                'UniqueName', '', dept.Team_Name__c, Integer.valueOf(dept.No_of_Member__c), dept.Region__c
            );
        } catch (Exception e) {
            failed = true;
        }
      
        
        // Blank teamName
        failed = false;
        try {
            DepartmentController.saveDepartment(
                'UniqueName2', String.valueOf(dept.User__c), '', Integer.valueOf(dept.No_of_Member__c), dept.Region__c
            );
        } catch (Exception e) {
            failed = true;
        }
    
        
        // noOfMembers is null
        failed = false;
        try {
            DepartmentController.saveDepartment(
                'UniqueName3', String.valueOf(dept.User__c), dept.Team_Name__c, null, dept.Region__c
            );
        } catch (Exception e) {
            failed = true;
        }
 
        
        // noOfMembers < 1
        failed = false;
        try {
            DepartmentController.saveDepartment(
                'UniqueName4', String.valueOf(dept.User__c), dept.Team_Name__c, 0, dept.Region__c
            );
        } catch (Exception e) {
            failed = true;
        }
   
        
        // Blank region
        failed = false;
        try {
            DepartmentController.saveDepartment(
                'UniqueName5', String.valueOf(dept.User__c), dept.Team_Name__c, Integer.valueOf(dept.No_of_Member__c), ''
            );
        } catch (Exception e) {
            failed = true;
        }
   
    }

    @isTest
    static void testSaveDepartment_DuplicateDepartmentName() {
        Department__c dept = [SELECT Id, Name, User__c, No_of_Member__c, Team_Name__c, Region__c FROM Department__c LIMIT 1];
        Boolean failed = false;
        try {
            DepartmentController.saveDepartment(
                dept.Name, String.valueOf(dept.User__c), dept.Team_Name__c, Integer.valueOf(dept.No_of_Member__c), dept.Region__c
            );
        } catch (Exception e) {
            failed = true;
        }
     
    }

    @isTest
    static void testGetDepartmentById_Exception() {
        Boolean failed = false;
        try {
            // Passing an invalid/unknown Id
            DepartmentController.getDepartmentById('001000000000000AAA');
        } catch (Exception e) {
            failed = true;
        }
      
    }

    @isTest
    static void testSaveDepartment_DmlException() {
        // Force a DmlException by using an invalid User Id
        Boolean failed = false;
        try {
            DepartmentController.saveDepartment(
                'DmlExceptionDept',
                'a01234567890123AAA', // Invalid user id
                'TeamX',
                1,
                'East'
            );
        } catch (Exception e) {
            failed = true;
        }
    }
}