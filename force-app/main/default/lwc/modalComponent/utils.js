  // Calculate Nachlass based on Totalpreis and Verkaufspreis
 export function calculateNachlass(totalpreis, verkaufspreis) {
    // Ensure both values are numbers and not null or undefined
    totalpreis = Number(totalpreis);
    verkaufspreis = Number(verkaufspreis);

    if (!isNaN(totalpreis) && !isNaN(verkaufspreis)) {
      return parseFloat((totalpreis - verkaufspreis).toFixed(2)); // Return Nachlass with 2 decimal places
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
      return parseFloat((verkaufspreis - produktkosten * quantity).toFixed(2)); // Return Rohertrag with 2 decimal places
    }
    return "0.00"; // Default to '0.00' if there's an error in calculation
  }

 export function calculateRabatt(totalpreis, verkaufspreis) {
    totalpreis = Number(totalpreis);
    verkaufspreis = Number(verkaufspreis);

    if (totalpreis > 0) {
      // Calculate discount percentage and fix to two decimal places
      const rabatt = ((totalpreis - verkaufspreis) / totalpreis) * 100;
      return parseFloat(rabatt.toFixed(2)); // Convert string back to float if necessary
    }
    return 0; // If totalPrice is 0, return 0 to avoid division by zero
  }