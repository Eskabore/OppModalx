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
import AMOUNT_FIELD from "@salesforce/schema/Opportunity.Amount";
import BAUSTART_OBJECT from "@salesforce/schema/Baustart__c";
import BAUSTART_LINE_ITEM_OBJECT from "@salesforce/schema/Baustart_Line_Item__c";
import RECORD_CREATED_FIELD from "@salesforce/schema/Opportunity.Erm_igungen_Zusammenfassung__c";
import { calculateNachlass, calculateRabatt, calculateRohertrag } from "./utils";

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
        // Calculate the initial Rohertrag as Listenpreis minus Produktkosten
        const initialRohertrag = (
          (item.UnitPrice - item.Produktkosten__c) *
          item.Quantity
        ).toFixed(2);

        return {
          ...item,
          Listenpreis: item.UnitPrice,
          Totalpreis: item.TotalPrice,
          Verkaufspreis: item.TotalPrice, // Initial Verkaufspreis is the same as TotalPrice
          Rabatt: 0, // Initial Rabatt is 0
          Nachlass: 0, // Initial Nachlass is 0
          Rohertrag: initialRohertrag,
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
      const nachlass = calculateNachlass(
        item.Totalpreis,
        item.Verkaufspreis
      );
      // Calculate Rabatt directly within the map function using the formula you provided
      const rabatt = calculateRabatt(item.Totalpreis, item.Verkaufspreis);

      const rohertrag = calculateRohertrag(
        item.Verkaufspreis,
        item.Produktkosten__c,
        item.Quantity
      );
      return { ...item, nachlass, rabatt, rohertrag };
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

    if (this.totalRabatt > 10) {
      // Show error message to the user
      this.dispatchEvent(
          new ShowToastEvent({
              title: 'Save Operation Blocked',
              message: 'The overall Rabatt cannot exceed 10%. Please adjust the values.',
              variant: 'error'
          })
      );
      return; // Exit the function without saving
  }

    const baustartFields = {};
    baustartFields["OpportunityId__c"] = this.recordId; // Set the ID of the parent Opportunity record
    baustartFields["Rabatt_in_EUR__c"] = this.totalNachlass; // Set the Totalnachlass value
    baustartFields["Rabatt_in_Prozent__c"] = this.totalRabatt; // Set the Totalrabatt value
    baustartFields["TotalPrice__c"] = this.totalVerkaufspreis;
    baustartFields["Gesamtrohertrag__c"] = this.totalRohertrag;
    baustartFields["TotalTotalpreis__c"] = this.totalTotalpreis;

    // Define the rbaustartRecordInput for creating a new record
    const baustartRecordInput = {
      apiName: BAUSTART_OBJECT.objectApiName,
      fields: baustartFields,
    };

    // Create the record using Lightning Data Service (LDS)
    createRecord(baustartRecordInput)
      .then((baustartRecord) => {
        // Show success message for Baustart creation
        this.showToast("Success", "Baustart record created", "success");

        // Create Baustart Line Items for each line item in the modal
        const baustartLineItemRecords = this.lineItems.map((item) => {
          const baustartLineItemFields = {
            BaustartId__c: baustartRecord.id,
            Product_Name__c: item.Nur_Produktname__c,
            Name: item.Nur_Produktname__c,
            ListenPreis__c: item.Listenpreis, // Use item's Listenpreis
            Quantity__c: item.Quantity,
            Totalpreis__c: item.Totalpreis,
            Verkaufspreis__c: item.Verkaufspreis,
            Rabatt__c: calculateRabatt(
              item.Totalpreis,
              item.Verkaufspreis
            ),
            Nachlass__c: item.Nachlass, // Use item's Nachlass
            Rohertrag__c: item.Rohertrag,
          };

          return createRecord({
            apiName: BAUSTART_LINE_ITEM_OBJECT.objectApiName,
            fields: baustartLineItemFields,
          });
        });

        // Wait for all Baustart Line Item records to be created
        return Promise.all(baustartLineItemRecords);
      })
      .then(() => this.updateOpportunityRecord())
      .then(() => {
        if (!this.recordCreated) {
          // Notify the UI to refresh the Opportunity record
          getRecordNotifyChange([{ recordId: this.recordId }]);
          // Show success message for Opportunity update
          this.showToast(
            "Opportunity Updated",
            "Record created checkbox marked.",
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
    this.lineItems[itemIndex].Nachlass = calculateNachlass(
      this.lineItems[itemIndex].Totalpreis,
      updatedVerkaufspreis
    );
    // Calculate Rohertrag based on the updated Verkaufspreis, Produktkosten__c, and Quantity
    this.lineItems[itemIndex].Rohertrag = calculateRohertrag(
      updatedVerkaufspreis,
      this.lineItems[itemIndex].Produktkosten__c,
      this.lineItems[itemIndex].Quantity
    );
    this.updateTotalValues(); // Update total values when Verkaufspreis changes
  }



  // Method to update the Opportunity record
  updateOpportunityRecord() {
    if (!this.recordCreated) {
      const oppFields = {
        Id: this.recordId,
        [RECORD_CREATED_FIELD.fieldApiName]: true,
        Verkaufspreis__c: this.totalVerkaufspreis,
        Totalnachlass__c: this.totalNachlass
      };
      updateRecord({ fields: oppFields })
        .then(() => {
          this.showToast(
            "Success",
            "Opportunity updated successfully",
            "success"
          );
        })
        .catch((error) => {
          this.showToast("Error", error.body.message, "error");
        });
    } else {
      // Resolve immediately if no update is needed
      return Promise.resolve();
  }
  }
}
