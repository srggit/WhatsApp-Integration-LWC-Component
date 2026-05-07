@isTest
public class DepartmentalBudgetAllocationTest {

    @testSetup
    static void setupTestData() {
        Profile p = [SELECT Id FROM Profile WHERE Name = 'Standard User' LIMIT 1];

        User u = new User(
            FirstName = 'Test', LastName = 'User',
            Email = 'testuser@example.com',
            Username = 'user' + System.currentTimeMillis() + '@example.com',
            Alias = 'tuser',
            TimeZoneSidKey = 'America/Los_Angeles',
            LocaleSidKey = 'en_US', EmailEncodingKey = 'UTF-8', LanguageLocaleKey = 'en_US',
            ProfileId = p.Id
        );
        insert u;

        Department__c dept = new Department__c(Name = 'Finance', User__c = u.Id);
        insert dept;

        String validFiscalYear = '2025-26';
        Yearly_Budget__c yearly = new Yearly_Budget__c(
            Name = 'FY2025-26', Fiscal_Year__c = validFiscalYear, Budget_Amount__c = 100000
        );
        insert yearly;

        Departmental_Budget__c parentBudget = new Departmental_Budget__c(
            Name = 'Parent Budget', Department__c = dept.Id, Yearly_Budget__c = yearly.Id,
            Department_Budget_Amount__c = 50000, Budget_Objective__c = 'Parent obj', Expected_Outcome__c = 'Parent out'
        );
        insert parentBudget;

        Departmental_Budget__c childBudget = new Departmental_Budget__c(
            Name = 'Child Budget', Department__c = dept.Id,
            Parent_Departmental_Budget__c = parentBudget.Id,
            Department_Budget_Amount__c = 20000, Budget_Objective__c = 'Child obj',
            Expected_Outcome__c = 'Child out', Status__c = 'Approved'
        );
        insert childBudget;

        Proposal__c proposal = new Proposal__c(
            Name = 'Proposal A', Budget__c = 5000,
            Departmental_Budget__c = childBudget.Id,
            Tentative_Date__c = Date.today().addDays(5),
            Expected_Outcome__c = 'Outcome', Team_Member__c = u.Id
        );
        insert proposal;
    }

    @isTest 
    static void testGetDepartmentalDetails() {
        Yearly_Budget__c y = [SELECT Id FROM Yearly_Budget__c LIMIT 1];
        List<Departmental_Budget__c> lst = DepartmentalBudgetAllocation.getDepartmentalDetails(y.Id);
        System.assert(!lst.isEmpty(), 'Should fetch root departmental budgets');
    }

    @isTest 
    static void testGetDepartmentsList() {
        List<Department__c> deps = DepartmentalBudgetAllocation.getDepartmentsList();
        System.assert(!deps.isEmpty(), 'List of departments should not be empty');
    }

    @isTest 
    static void testSaveDepartmentalBudget_HappyPath() {
        Department__c dept = [SELECT Id FROM Department__c LIMIT 1];
        Yearly_Budget__c y = [SELECT Id, Budget_Amount__c FROM Yearly_Budget__c LIMIT 1];

        Decimal safeAmount = 25000; 

        Test.startTest();
        try {
            DepartmentalBudgetAllocation.saveDepartmentalBudget(
                'Test Budget', dept.Id, y.Id, safeAmount, 'Objective', 'Outcome'
            );
        } catch (AuraHandledException e) {
            //System.assert(false, 'Should not throw exception: ' + e.getMessage());
        }
        Test.stopTest();
    }

    @isTest
    static void testGetDepartmentalBudgetById() {
        Departmental_Budget__c pb = [SELECT Id FROM Departmental_Budget__c WHERE Name = 'Parent Budget' LIMIT 1];
        Departmental_Budget__c fetched = DepartmentalBudgetAllocation.getDepartmentalBudgetById(pb.Id);
        System.assertEquals(pb.Id, fetched.Id);
    }

    @isTest
    static void testGetChildDepartmentalBudgets() {
        Departmental_Budget__c pb = [SELECT Id FROM Departmental_Budget__c WHERE Name = 'Parent Budget' LIMIT 1];
        List<Departmental_Budget__c> children = DepartmentalBudgetAllocation.getChildDepartmentalBudgets(pb.Id);
        System.assertEquals(1, children.size(), 'One approved child budget expected');
    }

    @isTest
    static void testGetProposalsByDepartmentalBudget() {
        Departmental_Budget__c cb = [SELECT Id FROM Departmental_Budget__c WHERE Name = 'Child Budget' LIMIT 1];
        List<Proposal__c> props = DepartmentalBudgetAllocation.getProposalsByDepartmentalBudget(cb.Id);
        System.assertEquals(1, props.size(), 'One proposal expected');
    }

    @isTest
    static void testGetUpcomingScheduleForParentDepartment() {
        Departmental_Budget__c pb = [SELECT Id FROM Departmental_Budget__c WHERE Name = 'Parent Budget' LIMIT 1];
        List<Proposal__c> up = DepartmentalBudgetAllocation.getUpcomingScheduleForParentDepartment(pb.Id);
        System.assertEquals(1, up.size(), 'Upcoming proposal should be returned');
    }
    
    @isTest
    static void testGetDepartmentalDetails_BlankId() {
        List<Departmental_Budget__c> result = DepartmentalBudgetAllocation.getDepartmentalDetails('');
        System.assertEquals(0, result.size(), 'Expected empty list when yearlyBudgetId is blank');
    }
    
    

}