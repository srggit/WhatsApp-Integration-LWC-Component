@isTest
public class YearlyBudgetControllersTest {
	@isTest
    static void testYearlyBudgetController(){
        Yearly_Budget__c yb =  new Yearly_Budget__c(
            Name='Budget 2024-25',
            Fiscal_Year__c='2024-25',
            Budget_Amount__c=1000,
            Utilized_Budget__c=1000
        );
        insert yb;
        
        YearlyBudgetControllers.getYearlyBudgetData();
        YearlyBudgetControllers.getVarianceData();
    }
}