public with sharing class DepartmentChartController {
    
    public class DepartmentChartDTO {
        @AuraEnabled public Decimal x; 
        @AuraEnabled public Decimal y; 
        @AuraEnabled public String label; 
        @AuraEnabled public String color; 
        @AuraEnabled public Decimal utilized; 

        public DepartmentChartDTO(Decimal x, Decimal y, String label, String color, Decimal utilized) {
            this.x = x;
            this.y = y;
            this.label = label;
            this.color = color;
            this.utilized = utilized;
        }
    }

    @AuraEnabled(cacheable=true)
    public static List<DepartmentChartDTO> getDepartmentPerformanceChart(Id yearlyBudgetId) {
        List<DepartmentChartDTO> chartData = new List<DepartmentChartDTO>();

        List<Departmental_Budget__c> records = [
            SELECT 
               Department_Budget_Amount__c,
                Utilized__c,
                Utilized_Budget__c,
                Department__c
            FROM Departmental_Budget__c
            WHERE Yearly_Budget__c = :yearlyBudgetId
        ];

        for (Departmental_Budget__c rec : records) {
            Decimal budget = rec.Department_Budget_Amount__c;
            Decimal percent = rec.Utilized__c;
            Decimal utilized = rec.Utilized_Budget__c;
            String label = rec.Department__c;
            String color = ''; 

            chartData.add(new DepartmentChartDTO(budget, percent, label, color, utilized));
        }

        return chartData;
    }
}