public with sharing class DepartmentPerformanceChartController {
    @AuraEnabled(cacheable=true)
    public static List<Map<String, Object>> getDepartmentalPerformance(String yearlyBudgetId) {
        List<Departmental_Budget__c> records = [
            SELECT Id, Department_Budget_Amount__c, Utilized_Budget__c,
                   Department__r.Name
            FROM Departmental_Budget__c
            WHERE Yearly_Budget__c = :yearlyBudgetId
              AND Department_Budget_Amount__c != null
              AND Utilized_Budget__c != null
        ];

        List<Map<String, Object>> result = new List<Map<String, Object>>();
        for (Departmental_Budget__c dept : records) {
            Map<String, Object> row = new Map<String, Object>();
            row.put('label', dept.Department__r.Name);
            row.put('budget', dept.Department_Budget_Amount__c);
            row.put('utilized', dept.Utilized_Budget__c);
            result.add(row);
        }
        return result;
    }
}