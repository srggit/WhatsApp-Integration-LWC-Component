@isTest
private class YearlyBudgetControllerTest {
    @testSetup
static void setupTestData() {
    try {
        Yearly_Budget__c testBudget = new Yearly_Budget__c(
            Name = 'Test Budget FY25',
            Fiscal_Year__c = '2025-26',
            Budget_Amount__c = 100000,
            Business_Objective__c = 'Grow revenue',
            Expected_Outcome__c = 'Increase market share'
        );
        insert testBudget;
    } catch (Exception e) {
        System.debug('>>> Error in setupTestData: ' + e.getMessage());
        System.assert(false, 'Setup failed: ' + e.getMessage());
    }
}


    @isTest
    static void testCreateYearlyBudget() {
        // Prepare mock data for method input
        Map<String, Object> budgetData = new Map<String, Object>{
            'Name' => 'New Budget FY26',
            'Fiscal_Year__c' => '2026-27',
            'Budget_Amount__c' => 200000,
            'Business_Objective__c' => 'Expand operations',
            'Expected_Outcome__c' => 'Open new markets'
        };

        Test.startTest();
        String budgetId = YearlyBudgetController.createYearlyBudget(budgetData);
        Test.stopTest();

        // Assert record creation
        Yearly_Budget__c createdBudget = [
            SELECT Name, Fiscal_Year__c, Budget_Amount__c 
            FROM Yearly_Budget__c 
            WHERE Id = :budgetId
        ];
        System.assertEquals('2026-27', createdBudget.Fiscal_Year__c);
        System.assertEquals('New Budget FY26', createdBudget.Name);
    }

    @isTest
    static void testIsDuplicateFiscalYear_True() {
        Test.startTest();
        Boolean isDuplicate = YearlyBudgetController.isDuplicateFiscalYear('2025-26');
        Test.stopTest();

        System.assertEquals(true, isDuplicate, 'Expected duplicate for 2025');
    }

    @isTest
    static void testIsDuplicateFiscalYear_False() {
        Test.startTest();
        Boolean isDuplicate = YearlyBudgetController.isDuplicateFiscalYear('2030-31');
        Test.stopTest();

        System.assertEquals(false, isDuplicate, 'Expected no duplicate for 2030');
    }

    @isTest
    static void testGetYearlyBudgetDetails() {
        Test.startTest();
        List<Yearly_Budget__c> budgets = YearlyBudgetController.getYearlyBudgetDetails();
        Test.stopTest();

        System.assertNotEquals(0, budgets.size(), 'Expected at least one budget');
        System.assertNotEquals(null, budgets[0].Name);
    }
}