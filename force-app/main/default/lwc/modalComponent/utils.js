// Calculate Nachlass based on Totalpreis and Verkaufspreis
export function calculateNachlass(totalpreis, verkaufspreis) {
    // Ensure both values are numbers and not null or undefined
    totalpreis = Number(totalpreis);
    verkaufspreis = Number(verkaufspreis);

    if (!isNaN(totalpreis) && !isNaN(verkaufspreis)) {
      return (totalpreis - verkaufspreis).toFixed(2); // Return Nachlass with 2 decimal places
    }
    return "0.00"; // Default to '0.00' if there's an error in calculation
  }

  // Calculate Rohertrag based on Verkaufspreis, Produktkosten__c, and Quantity
 export function calculateRohertrag(verkaufspreis, produktkosten, quantity) {
    // Ensure all values are numbers and not null or undefined
    verkaufspreis = Number(verkaufspreis);
    produktkosten = Number(produktkosten);
    quantity = Number(quantity);

    if (!isNaN(verkaufspreis) && !isNaN(produktkosten) && !isNaN(quantity)) {
      // Multiply produktkosten by quantity before subtracting from verkaufspreis
      return (verkaufspreis - produktkosten * quantity).toFixed(2); // Return Rohertrag with 2 decimal places
    }
    return "0.00"; // Default to '0.00' if there's an error in calculation
  }
