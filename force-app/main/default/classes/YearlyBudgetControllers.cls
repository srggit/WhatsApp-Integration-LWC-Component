public with sharing class YearlyBudgetControllers {
    @AuraEnabled(cacheable=true)
    public static List<Yearly_Budget__c> getYearlyBudgetData() {
        return [
            SELECT Fiscal_Year__c, Budget_Amount__c, Utilized_Budget__c
            FROM Yearly_Budget__c
            ORDER BY Fiscal_Year__c ASC
        ];
    }
    
    @AuraEnabled(cacheable=true)
    public static List<Map<String, Object>> getVarianceData() {
        List<Yearly_Budget__c> budgetList = [
            SELECT Fiscal_Year__c, Budget_Amount__c, Utilized_Budget__c
            FROM Yearly_Budget__c
            ORDER BY Fiscal_Year__c ASC
        ];
        
        List<Map<String, Object>> result = new List<Map<String, Object>>();
        
        for (Yearly_Budget__c yb : budgetList) {
            // Handle null values with default of 0
            Decimal budgetAmount = yb.Budget_Amount__c != null ? yb.Budget_Amount__c : 0;
            Decimal utilizedAmount = yb.Utilized_Budget__c != null ? yb.Utilized_Budget__c : 0;
            
            // Calculate variance with null safety
            Decimal variance = 0;
            if (budgetAmount > 0) {
                variance = ((utilizedAmount - budgetAmount) / budgetAmount) * 100;
            }
            
            Map<String, Object> row = new Map<String, Object>{
                'year' => yb.Fiscal_Year__c,
                'budget' => budgetAmount,
                'utilized' => utilizedAmount,
                'variance' => variance
            };
            result.add(row);
        }
        return result;
    }
}