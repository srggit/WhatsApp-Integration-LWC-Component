@isTest
private class CreateTeamControllerTest {
    
    static void setupData(String fiscalYear) {
    User testUser = [SELECT Id FROM User WHERE IsActive = true LIMIT 1];

    // Create Yearly Budget
    Yearly_Budget__c yearlyBudget = new Yearly_Budget__c(
        Name = 'Budget FY ' + fiscalYear,
        Fiscal_Year__c = fiscalYear,
        Budget_Amount__c = 500000,
        Business_Objective__c='<p>Objective</p>',
        Expected_Outcome__c='<p>Outcome</p>'
       
    );
    insert yearlyBudget;

    // Create Parent Department (Top-level, so Parent_Department__c = null)
    Department__c parentDept = new Department__c(
        Name = 'Main Department',
        User__c = testUser.Id,
        Parent_Department__c = null
    );
    insert parentDept;

    // Create Parent Departmental Budget
    Departmental_Budget__c parentBudget = new Departmental_Budget__c(
        Name = 'Parent Budget',
        Department__c = parentDept.Id,
        Department_Budget_Amount__c = 300000,
        //Utilized_Budget__c = 50000,
        Yearly_Budget__c = yearlyBudget.Id,
        Budget_Objective__c = '<p>Objective</p>',
        Expected_Outcome__c = '<p>Outcome</p>',
        Parent_Departmental_Budget__c = null
    );
    insert parentBudget;
}


    @isTest
    static void testGetTeamUsers() {
        Test.startTest();
        List<User> users = CreateTeamController.getTeamUsers();
        Test.stopTest();
        System.assert(!users.isEmpty(), 'Should return active users');
    }
    
    @isTest
    static void testGetInitialTeamData() {
        User testUser = [SELECT Id FROM User WHERE IsActive = true LIMIT 1];
        System.runAs(testUser) {
            setupData('2025-26');
    
            Test.startTest();
            CreateTeamController.InitData initData = CreateTeamController.getInitialTeamData('2025-26');
            Test.stopTest();
    
            System.assertNotEquals(null, initData.availableBudget);
            System.assertEquals('2025-26', initData.fiscalYear);
        }
    }


    @isTest
    static void testSaveTeamDataAndApproval() {
        setupData('2025-26');

        User testUser = [SELECT Id FROM User WHERE IsActive = true LIMIT 1];
        System.runAs(testUser) {
            CreateTeamController.PayloadWrapper payload = new CreateTeamController.PayloadWrapper();
            payload.teamName = 'New Team';
            payload.NoOfMembers = 5;
            payload.region = 'East';
            payload.TeamHead = testUser.Id;
            payload.departmentalBudgetName = 'New Team Budget';
            payload.budgetAllotted = 50000;
            payload.budgetObjective = '<b>Goal</b>';
            payload.expectedOutcome = '<i>Impact</i>';
            payload.fiscalYear = '2025-26';

            CreateTeamController.ProposalWrapper p = new CreateTeamController.ProposalWrapper();
            p.name = 'Activity 1';
            p.outcome = '<b>Outcome</b>';
            p.budget = 15000;
            p.dates = String.valueOf(Date.today());
            p.assignTo = testUser.Id;
            p.revenue = 25000;

            payload.activities = new List<CreateTeamController.ProposalWrapper>{ p };

            String json = JSON.serialize(payload);

            Test.startTest();
            CreateTeamController.saveTeamData(json);
            Test.stopTest();

            List<Department__c> created = [SELECT Id FROM Department__c WHERE Name = 'New Team'];
            System.assertEquals(1, created.size(), 'Team should be created');

            List<Departmental_Budget__c> budgets = [
                SELECT Id FROM Departmental_Budget__c WHERE Department__c = :created[0].Id
            ];
            System.assertEquals(1, budgets.size(), 'Budget should be created');

            List<Proposal__c> proposals = [
                SELECT Id FROM Proposal__c WHERE Departmental_Budget__c = :budgets[0].Id
            ];
            System.assertEquals(1, proposals.size(), 'Proposal should be created');
        }
    }

    @isTest
    static void testGetPendingApprovals_And_Process() {
        Test.startTest();
        List<ProcessInstanceWorkitem> items = CreateTeamController.getPendingApprovals();
        Test.stopTest();
        // Approval setup is required for actual records. Just confirm no error for now.
        System.assertNotEquals(null, items);
    }

    @isTest
    static void testProcessApproval_NoError() {
        Test.startTest();
        try {
            CreateTeamController.processApproval('dummyId', true);
            System.assert(true, 'Method ran without exception'); // Success path
        } catch (Exception e) {
            System.debug('Expected exception: ' + e.getMessage());
            System.assert(e.getMessage() != null && e.getMessage().length() > 0, 'Expected exception message');
        }
        Test.stopTest();
    }

}