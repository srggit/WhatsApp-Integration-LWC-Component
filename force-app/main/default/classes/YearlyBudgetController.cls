public with sharing class YearlyBudgetController {
    @AuraEnabled
    public static String createYearlyBudget(Map<String, Object> budgetData) {
        try {
            Yearly_Budget__c budget = new Yearly_Budget__c();

            budget.Name = (String)budgetData.get('Name');
            budget.Fiscal_Year__c = (String)budgetData.get('Fiscal_Year__c');
            budget.Budget_Amount__c = (Decimal)budgetData.get('Budget_Amount__c');
            budget.Business_Objective__c = (String)budgetData.get('Business_Objective__c');
            budget.Expected_Outcome__c = (String)budgetData.get('Expected_Outcome__c');

            insert budget;
            
            // Return the newly created record ID
            return budget.Id;
        } catch (Exception e) {
            throw new AuraHandledException('Error creating yearly budget: ' + e.getMessage());
        }
    }    
        
    @AuraEnabled(cacheable=false)
    public static Boolean isDuplicateFiscalYear(String fiscalYear) {
        try {
            return [
                SELECT Id FROM Yearly_Budget__c WHERE Fiscal_Year__c = :fiscalYear LIMIT 1
            ].size() > 0;
        } catch (Exception e) {
            throw new AuraHandledException('Error checking duplicate fiscal year: ' + e.getMessage());
        }
    }

    @AuraEnabled(cacheable=true)
    public static List<Yearly_Budget__c> getYearlyBudgetDetails() {
        System.debug('>> Entering getYearlyBudgetDetails');
        try {
            List<Yearly_Budget__c> budgetList = [
                SELECT Id, Name, Fiscal_Year__c, Budget_Amount__c, 
                    Start_Date__c, End_Date__c, Utilized_Budget__c, Utilized__c,
                    Business_Objective__c, Expected_Outcome__c
                FROM Yearly_Budget__c
                ORDER BY CreatedDate DESC
            ];
            System.debug('>> Retrieved ' + budgetList.size() + ' Yearly Budget records');
            return budgetList;
        } catch (Exception e) {
            System.debug('!! Exception in getYearlyBudgetDetails: ' + e.getMessage());
            throw new AuraHandledException('Error fetching yearly budget details: ' + e.getMessage());
        }
    }
}