public class ContactAndLeadSearch {
    public static List<List<SObject>> searchContactsAndLeads(String name) {
        // Perform SOSL query to find contacts and leads with matching first or last name
        List<List<SObject>> searchResults = [FIND :name IN NAME FIELDS RETURNING Contact(Id, FirstName, LastName), Lead(Id, FirstName, LastName)];
        return searchResults;
    }
}