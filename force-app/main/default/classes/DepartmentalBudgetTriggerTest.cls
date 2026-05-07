@isTest
public class DepartmentalBudgetTriggerTest {

    @testSetup
    static void setupData() {
        // Create 4 departments
        List<Department__c> departments = new List<Department__c>{
            new Department__c(Name = 'IT'),
            new Department__c(Name = 'HR'),
            new Department__c(Name = 'Finance'),
            new Department__c(Name = 'Procurement')
        };
        insert departments;

        // Create Yearly Budget
        Yearly_Budget__c yearlyBudget = new Yearly_Budget__c(
            Name = 'FY 2025',
            Budget_Amount__c = 1000
        );
        insert yearlyBudget;

        // Create top-level Departmental Budget
        Departmental_Budget__c topDeptBudget = new Departmental_Budget__c(
            Name = 'Admin Budget',
            Department_Budget_Amount__c = 500,
            Yearly_Budget__c = yearlyBudget.Id,
            Department__c = departments[0].Id, // IT
            Status__c = 'Approved'
        );
        insert topDeptBudget;

        // Create one approved child
        Departmental_Budget__c approvedChild = new Departmental_Budget__c(
            Name = 'Sub Budget 1',
            Department_Budget_Amount__c = 200,
            Parent_Departmental_Budget__c = topDeptBudget.Id,
            Department__c = departments[1].Id, // HR
            Status__c = 'Approved'
        );
        insert approvedChild;

        // Create rejected child
        Departmental_Budget__c rejectedChild = new Departmental_Budget__c(
            Name = 'Rejected Child',
            Department_Budget_Amount__c = 150,
            Parent_Departmental_Budget__c = topDeptBudget.Id,
            Department__c = departments[2].Id, // Finance
            Status__c = 'Rejected'
        );
        insert rejectedChild;
    }

    @isTest
    static void testValidInsertWithinLimit() {
        Department__c dept = [SELECT Id FROM Department__c WHERE Name = 'Procurement' LIMIT 1];
        Departmental_Budget__c parentBudget = [SELECT Id FROM Departmental_Budget__c WHERE Name = 'Admin Budget' LIMIT 1];

        Departmental_Budget__c newBudget = new Departmental_Budget__c(
            Name = 'Valid Insert',
            Department_Budget_Amount__c = 100,
            Parent_Departmental_Budget__c = parentBudget.Id,
            Department__c = dept.Id,
            Status__c = 'Approved'
        );

        Test.startTest();
        insert newBudget;
        Test.stopTest();

        System.assertNotEquals(null, newBudget.Id);
    }

    @isTest
    static void testExceedYearlyBudget() {
        Department__c dept = new Department__c(Name = 'Legal');
        insert dept;

        Yearly_Budget__c yearly = [SELECT Id FROM Yearly_Budget__c WHERE Name = 'FY 2025' LIMIT 1];

        Departmental_Budget__c newBudget = new Departmental_Budget__c(
            Name = 'Exceed Yearly',
            Department_Budget_Amount__c = 600, // Total: 500 + 600 = 1100 > 1000
            Yearly_Budget__c = yearly.Id,
            Department__c = dept.Id,
            Status__c = 'Approved'
        );

        Test.startTest();
        try {
            insert newBudget;
            System.assert(false, 'Expected exception not thrown');
        } catch (DmlException e) {
            System.assert(e.getMessage().contains('Total Departmental Budget exceeds the Yearly Budget Amount'));
        }
        Test.stopTest();
    }

    @isTest
    static void testExceedParentBudgetLimit() {
        Department__c dept = new Department__c(Name = 'Operations');
        insert dept;

        Departmental_Budget__c parent = [SELECT Id FROM Departmental_Budget__c WHERE Name = 'Admin Budget' LIMIT 1];

        Departmental_Budget__c newChild = new Departmental_Budget__c(
            Name = 'Exceed Parent Limit',
            Department_Budget_Amount__c = 400, // Approved child = 200, 200 + 400 = 600 > 500
            Parent_Departmental_Budget__c = parent.Id,
            Department__c = dept.Id,
            Status__c = 'Approved'
        );

        Test.startTest();
        try {
            insert newChild;
            System.assert(false, 'Expected exception not thrown');
        } catch (DmlException e) {
            System.assert(e.getMessage().contains('Total Departmental Budget exceeds the Parent Departmental Budget Amount'));
        }
        Test.stopTest();
    }

    @isTest
    static void testRejectedStatusIgnored() {
        Department__c dept = new Department__c(Name = 'Audit');
        insert dept;

        Departmental_Budget__c parent = [SELECT Id FROM Departmental_Budget__c WHERE Name = 'Admin Budget' LIMIT 1];

        Departmental_Budget__c validChild = new Departmental_Budget__c(
            Name = 'Valid Despite Rejected',
            Department_Budget_Amount__c = 300, // Only one approved = 200, 200 + 300 = 500 = OK
            Parent_Departmental_Budget__c = parent.Id,
            Department__c = dept.Id,
            Status__c = 'Approved'
        );

        Test.startTest();
        insert validChild;
        Test.stopTest();

        System.assertNotEquals(null, validChild.Id);
    }
}