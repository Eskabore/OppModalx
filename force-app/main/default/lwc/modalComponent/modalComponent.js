import { LightningElement, api, wire, track } from "lwc";
import getOpportunityLineItems from "@salesforce/apex/OpportunityLineItemService.getOpportunityLineItems";
import { ShowToastEvent } from "lightning/platformShowToastEvent";
import {
  getRecord,
  createRecord,
  updateRecord,
  getFieldValue,
  getRecordNotifyChange,
} from "lightning/uiRecordApi";
import OPPORTUNITY_DISCOUNT_SUMMARY_OBJECT from "@salesforce/schema/OpportunityDiscountSummary__c";
import OPPORTUNITY_OBJECT from "@salesforce/schema/Opportunity";
import RECORD_CREATED_FIELD from "@salesforce/schema/Opportunity.Erm_igungen_Zusammenfassung__c";

export default class ModalComponent extends LightningElement {
  @api recordId; // The ID of the Opportunity record
  isModalOpen = false;
  lineItems = [];
  totalNachlass = 0;
  totalRabatt = 0;
  totalVerkaufspreis = 0;
  totalRohertrag = 0;

  @wire(getRecord, { recordId: "$recordId", fields: [RECORD_CREATED_FIELD] })
  opportunity;

  @wire(getOpportunityLineItems, { opportunityId: "$recordId" })
  wiredLineItems({ error, data }) {
    if (data) {
      this.lineItems = data.map((item) => {
        // Map your data to the expected format, if necessary
        return {
          ...item,
          Listenpreis: item.UnitPrice,
          Totalpreis: item.TotalPrice,
          Verkaufspreis: item.TotalPrice, // Initial Verkaufspreis is the same as TotalPrice
          Rabatt: 0, // Initial Rabatt is 0
          Nachlass: 0, // Initial Nachlass is 0
          Rohertrag: 0, // Initial Rohertrag is 0
        };
      });
      this.updateTotalValues();
    } else if (error) {
      // Handle errors
      console.error("Error fetching OpportunityLineItems:", error);
    }
  }

  get recordCreated() {
    return getFieldValue(this.opportunity.data, RECORD_CREATED_FIELD);
  }

  get lineItemsWithNachlass() {
    return this.lineItems.map((item) => {
      const nachlass = this.calculateNachlass(
        item.Totalpreis,
        item.Verkaufspreis
      );
      // Calculate Rabatt directly within the map function using the formula you provided
      const rabatt =
        ((item.Totalpreis - item.Verkaufspreis) / item.Totalpreis) * 100;
      const rohertrag = this.calculateRohertrag(
        item.Verkaufspreis,
        item.Produktkosten__c,
        item.Quantity
      );
      return { ...item, nachlass, rabatt: rabatt.toFixed(2), rohertrag };
    });
  }

  openModal() {
    this.isModalOpen = true;
  }

  // Function to close the modal
  closeModal() {
    this.isModalOpen = false;
  }

  // Function to handle the save action
  saveDetails() {
    const fields = {};
    fields["Opportunity__c"] = this.recordId; // Set the ID of the parent Opportunity record
    fields["Totalnachlass__c"] = this.totalNachlass; // Set the Totalnachlass value
    fields["Totalrabatt__c"] = this.totalRabatt; // Set the Totalrabatt value
    fields["Totalverkaufspreis__c"] = this.totalVerkaufspreis;
    fields["Totalrohertrag__c"] = this.totalRohertrag;

    // Define the recordInput for creating a new record
    const recordInput = {
      apiName: OPPORTUNITY_DISCOUNT_SUMMARY_OBJECT.objectApiName,
      fields,
    };

    // Create the record using Lightning Data Service (LDS)
    createRecord(recordInput)
      .then((record) => {
        // Show success message
        this.showToast(
          "Success",
          "Opportunity Discount Summary erstellt",
          "success"
        );

        // If the record created field is not already checked, update it
        if (!this.recordCreated) {
          const oppFields = {};
          oppFields["Id"] = this.recordId;
          oppFields[RECORD_CREATED_FIELD.fieldApiName] = true;

          return updateRecord({ fields: oppFields });
        }
      })
      .then(() => {
        if (!this.recordCreated) {
          // Notify the UI to refresh from server-side data
          getRecordNotifyChange([{ recordId: this.recordId }]);

          // Show additional success message if the checkbox was updated
          this.showToast(
            "Opportunity Aktualisiert",
            "Erm_igungen_Zusammenfassung Checkbox markiert.",
            "success"
          );
        }
      })
      .catch((error) => {
        // Handle any errors that occur during record creation or update
        this.showToast("Error", error.body.message, "error");
      })
      .finally(() => {
        // Close the modal in any case
        this.closeModal();
      });
  }

  showToast(title, message, variant) {
    this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
  }

  // Call this method to update totalNachlass and totalRabatt whenever lineItems data changes
  updateTotalValues() {
    this.totalNachlass = parseFloat(
      this.lineItems
        .reduce((acc, item) => acc + Number(item.Nachlass), 0)
        .toFixed(2)
    );
    this.totalTotalpreis = this.lineItems.reduce(
      (acc, item) => acc + Number(item.Totalpreis),
      0
    );
    this.totalVerkaufspreis = this.lineItems.reduce(
      (acc, item) => acc + Number(item.Verkaufspreis),
      0
    );
    this.totalRohertrag = this.lineItems.reduce(
      (acc, item) => acc + Number(item.Rohertrag),
      0
    );

    if (this.totalTotalpreis > 0) {
      this.totalRabatt = parseFloat(
        (
          ((this.totalTotalpreis - this.totalVerkaufspreis) /
            this.totalTotalpreis) *
          100
        ).toFixed(2)
      );
    }
  }

  // Handler for Verkaufspreis changes
  handleVerkaufspreisChange(event) {
    const itemIndex = this.lineItems.findIndex(
      (item) => item.Id === event.target.dataset.id
    );
    const updatedVerkaufspreis = event.target.value;
    this.lineItems[itemIndex].Verkaufspreis = updatedVerkaufspreis;
    // Calculate Nachlass based on the updated Verkaufspreis
    this.lineItems[itemIndex].Nachlass = this.calculateNachlass(
      this.lineItems[itemIndex].Totalpreis,
      updatedVerkaufspreis
    );
    // Calculate Rohertrag based on the updated Verkaufspreis, Produktkosten__c, and Quantity
    this.lineItems[itemIndex].Rohertrag = this.calculateRohertrag(
      updatedVerkaufspreis,
      this.lineItems[itemIndex].Produktkosten__c,
      this.lineItems[itemIndex].Quantity
    );
    this.updateTotalValues(); // Update total values when Verkaufspreis changes
  }

  // Calculate Nachlass based on Totalpreis and Verkaufspreis
  calculateNachlass(totalpreis, verkaufspreis) {
    // Ensure both values are numbers and not null or undefined
    totalpreis = Number(totalpreis);
    verkaufspreis = Number(verkaufspreis);

    if (!isNaN(totalpreis) && !isNaN(verkaufspreis)) {
      return parseFloat((totalpreis - verkaufspreis).toFixed(2)); // Return Nachlass with 2 decimal places
    }
    return "0.00"; // Default to '0.00' if there's an error in calculation
  }

  // Calculate Rohertrag based on Verkaufspreis, Produktkosten__c, and Quantity
  calculateRohertrag(verkaufspreis, produktkosten, quantity) {
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
}
