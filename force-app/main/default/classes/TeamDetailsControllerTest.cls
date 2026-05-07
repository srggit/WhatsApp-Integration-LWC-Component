@isTest
private class TeamDetailsControllerTest {
    
    static void setupTestData(String fiscalYear) {
        User testUser = [SELECT Id FROM User WHERE IsActive = true LIMIT 1];

        Department__c dept = new Department__c(Name = 'Test Team', User__c = testUser.Id);
        insert dept;

        Yearly_Budget__c yearlyBudget = new Yearly_Budget__c(
            Name = 'Yearly Budget FY ' + fiscalYear,
            Fiscal_Year__c = fiscalYear,
            Budget_Amount__c = 1000000,
            Business_Objective__c='<p>Objective</p>',
            Expected_Outcome__c='<p>Outcome</p>'
            
        );
        insert yearlyBudget;
        
        Departmental_Budget__c parentbudget = new Departmental_Budget__c(
            Name = 'Dept Budget',
            Department__c = dept.Id,
            Yearly_Budget__c = yearlyBudget.Id,
            Department_Budget_Amount__c = 100000,
            Budget_Objective__c = '<p>Objective</p>',
            Expected_Outcome__c = '<p>Outcome</p>'
        );
        insert parentbudget;

        Departmental_Budget__c budget = new Departmental_Budget__c(
            Name = 'Dept Budget',
            Department__c = dept.Id,
            //Yearly_Budget__c = yearlyBudget.Id,
            Parent_Departmental_Budget__c=parentbudget.Id,
            Department_Budget_Amount__c = 50000,
            Budget_Objective__c = '<p>Objective</p>',
            Expected_Outcome__c = '<p>Outcome</p>',
            Status__c = 'Approved'
        );
        insert budget;

        Proposal__c proposal = new Proposal__c(
            Name = 'Proposal 1',
            Departmental_Budget__c = budget.Id,
            //Tentative_Month__c = 'August',
            Tentative_Date__c = Date.today().addDays(5),
            Budget__c=10000,
            Approved_Budget__c = 20000,
            Expected_Revenue__c=11111,
            Actual_Revenue__c = 8000,
            Expected_Outcome__c = '<p>Expected Result</p>'
        );
        insert proposal;
    }

    @isTest
    static void testGetTeamDetails() {
        String fiscalYear = '2024-25';
        setupTestData(fiscalYear);

        Department__c dept = [SELECT Id FROM Department__c WHERE Name = 'Test Team' LIMIT 1];

        Test.startTest();
        TeamDetailsController.TeamDetailsWrapper result = TeamDetailsController.getTeamDetails(dept.Id, fiscalYear);
        Test.stopTest();

        System.assertNotEquals(null, result);
        System.assertEquals('Test Team', result.teamName);
        System.assertEquals(50000, result.budgetAllocated);
        System.assertEquals(20000, result.budgetUtilized);
        System.assertEquals('<p>Objective</p>', result.budgetObjective);
        System.assertEquals('<p>Outcome</p>', result.expectedOutcome);
        System.assertEquals(40, result.utilizedPercent);
       // System.assertEquals(1, result.proposalList.size());
    }

    @isTest
    static void testGetUpcomingSchedules() {
        String fiscalYear = '2024-25';
        setupTestData(fiscalYear);

        Department__c dept = [SELECT Id FROM Department__c WHERE Name = 'Test Team' LIMIT 1];

        Test.startTest();
        List<TeamDetailsController.ScheduleWrapper> result = TeamDetailsController.getUpcomingSchedules(dept.Id, fiscalYear);
        Test.stopTest();

        System.assertNotEquals(null, result);
        System.assertEquals(1, result.size());
        System.assertEquals('Proposal 1', result[0].name);
    }

    @isTest
    static void testUpdateProposals() {
        String fiscalYear = '2024-25';
        setupTestData(fiscalYear);

        Proposal__c prop = [SELECT Id FROM Proposal__c WHERE Name = 'Proposal 1' LIMIT 1];

        List<Map<String, Object>> updates = new List<Map<String, Object>>{
            new Map<String, Object>{
                'id' => prop.Id,
                'approvedBudget' => 12000,
                'actualRevenue' => 9000
            }
        };

        Test.startTest();
        TeamDetailsController.updateProposals(updates);
        Test.stopTest();

        Proposal__c updated = [SELECT Approved_Budget__c, Actual_Revenue__c FROM Proposal__c WHERE Id = :prop.Id];
        System.assertEquals(12000, updated.Approved_Budget__c);
        System.assertEquals(9000, updated.Actual_Revenue__c);
    }

    @isTest
    static void testGetTeamDetails_noBudget() {
        User u = [SELECT Id FROM User WHERE IsActive = true LIMIT 1];
        Department__c dept = new Department__c(Name = 'No Budget Dept', User__c = u.Id);
        insert dept;

        Test.startTest();
        TeamDetailsController.TeamDetailsWrapper wrapper =
            TeamDetailsController.getTeamDetails(dept.Id, '2024-25');
        Test.stopTest();

        System.assertEquals('No Budget Dept', wrapper.teamName);
        System.assertEquals(0, wrapper.budgetAllocated);
        System.assertEquals(0, wrapper.budgetUtilized);
        System.assertEquals(0, wrapper.utilizedPercent);
    }

    @isTest
    static void testGetTeamDetails_withInvalidId() {
        Test.startTest();
        TeamDetailsController.TeamDetailsWrapper wrapper =
            TeamDetailsController.getTeamDetails('001000000000000AAA', '2024-25');
        Test.stopTest();

        System.assertEquals('N/A', wrapper.teamName);
        System.assertEquals(0, wrapper.budgetAllocated);
    }

    @isTest
    static void testGetUpcomingSchedules_noProposals() {
        String fiscalYear = '2024-25';
        setupTestData(fiscalYear);

        Department__c dept = [SELECT Id FROM Department__c WHERE Name = 'Test Team' LIMIT 1];

        delete [SELECT Id FROM Proposal__c];

        Test.startTest();
        List<TeamDetailsController.ScheduleWrapper> schedules =
            TeamDetailsController.getUpcomingSchedules(dept.Id, fiscalYear);
        Test.stopTest();

        System.assertEquals(0, schedules.size(), 'Should return empty list');
    }

    @isTest
    static void testUpdateProposals_edgeCases() {
        Proposal__c prop = new Proposal__c(Name = 'Edge Case Proposal',Budget__c=1000, Tentative_Date__c=Date.today().addDays(7));
        insert prop;

        List<Map<String, Object>> updates = new List<Map<String, Object>>{
            new Map<String, Object>{ 'id' => prop.Id, 'approvedBudget' => null },
            new Map<String, Object>{ 'id' => prop.Id, 'actualRevenue' => '' },
            new Map<String, Object>{ 'approvedBudget' => 123 }, // No ID
            new Map<String, Object>{ } // Empty map
        };

        Test.startTest();
        TeamDetailsController.updateProposals(updates);
        Test.stopTest();

        Proposal__c unchanged = [SELECT Approved_Budget__c, Actual_Revenue__c FROM Proposal__c WHERE Id = :prop.Id];
        System.assertEquals(null, unchanged.Approved_Budget__c);
        System.assertEquals(null, unchanged.Actual_Revenue__c);
    }
}