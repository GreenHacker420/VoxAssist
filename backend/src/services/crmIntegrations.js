const logger = require('../utils/logger');
const axios = require('axios');
const db = require('../database/connection');

/**
 * CRM Integrations Service - Functional Version
 * Integrates with Salesforce, HubSpot, and other CRM systems
 */

// Module state
let integrations = {
  salesforce: {
    enabled: false,
    accessToken: null,
    instanceUrl: null,
    refreshToken: null
  },
  hubspot: {
    enabled: false,
    accessToken: null,
    portalId: null
  }
};

/**
 * Initialize CRM integrations
 */
const initializeCRMIntegrations = async () => {
  try {
    // Initialize Salesforce if configured
    if (process.env.SALESFORCE_CLIENT_ID && process.env.SALESFORCE_CLIENT_SECRET) {
      await initializeSalesforce();
    }

    // Initialize HubSpot if configured
    if (process.env.HUBSPOT_ACCESS_TOKEN) {
      await initializeHubSpot();
    }

    logger.info('CRM integrations initialized');
  } catch (error) {
    logger.error('Error initializing CRM integrations:', error);
  }
};

/**
 * Initialize Salesforce integration
 */
const initializeSalesforce = async () => {
  try {
    if (process.env.SALESFORCE_REFRESH_TOKEN) {
      await refreshSalesforceToken();
    }
    
    integrations.salesforce.enabled = true;
    logger.info('Salesforce integration initialized');
  } catch (error) {
    logger.error('Error initializing Salesforce:', error);
    integrations.salesforce.enabled = false;
  }
};

/**
 * Initialize HubSpot integration
 */
const initializeHubSpot = async () => {
  try {
    integrations.hubspot.accessToken = process.env.HUBSPOT_ACCESS_TOKEN;
    integrations.hubspot.portalId = process.env.HUBSPOT_PORTAL_ID;
    
    // Test HubSpot connection
    await testHubSpotConnection();
    
    integrations.hubspot.enabled = true;
    logger.info('HubSpot integration initialized');
  } catch (error) {
    logger.error('Error initializing HubSpot:', error);
    integrations.hubspot.enabled = false;
  }
};

/**
 * Refresh Salesforce access token
 */
const refreshSalesforceToken = async () => {
  try {
    const response = await axios.post('https://login.salesforce.com/services/oauth2/token', null, {
      params: {
        grant_type: 'refresh_token',
        client_id: process.env.SALESFORCE_CLIENT_ID,
        client_secret: process.env.SALESFORCE_CLIENT_SECRET,
        refresh_token: process.env.SALESFORCE_REFRESH_TOKEN
      }
    });

    integrations.salesforce.accessToken = response.data.access_token;
    integrations.salesforce.instanceUrl = response.data.instance_url;
    
    logger.info('Salesforce token refreshed successfully');
  } catch (error) {
    logger.error('Error refreshing Salesforce token:', error);
    throw error;
  }
};

/**
 * Test HubSpot connection
 */
const testHubSpotConnection = async () => {
  try {
    const response = await axios.get('https://api.hubapi.com/contacts/v1/lists/all/contacts/all', {
      headers: {
        'Authorization': `Bearer ${integrations.hubspot.accessToken}`
      },
      params: {
        count: 1
      }
    });

    return response.status === 200;
  } catch (error) {
    logger.error('HubSpot connection test failed:', error);
    throw error;
  }
};

/**
 * Sync call data to Salesforce
 */
const syncCallToSalesforce = async (callData) => {
  try {
    if (!integrations.salesforce.enabled) {
      throw new Error('Salesforce integration not enabled');
    }

    // Create or update contact
    const contact = await createOrUpdateSalesforceContact(callData.customer);
    
    // Create activity/task record
    const activity = await createSalesforceActivity(callData, contact.Id);

    // Update opportunity if exists
    if (callData.opportunityId) {
      await updateSalesforceOpportunity(callData.opportunityId, callData);
    }

    logger.info(`Call ${callData.id} synced to Salesforce successfully`);
    return { contact, activity };
  } catch (error) {
    logger.error('Error syncing call to Salesforce:', error);
    throw error;
  }
};

/**
 * Create or update Salesforce contact
 */
const createOrUpdateSalesforceContact = async (customerData) => {
  try {
    // Search for existing contact
    const searchResponse = await axios.get(
      `${integrations.salesforce.instanceUrl}/services/data/v57.0/query/`,
      {
        headers: {
          'Authorization': `Bearer ${integrations.salesforce.accessToken}`,
          'Content-Type': 'application/json'
        },
        params: {
          q: `SELECT Id, Email FROM Contact WHERE Email = '${customerData.email}' LIMIT 1`
        }
      }
    );

    if (searchResponse.data.records.length > 0) {
      // Update existing contact
      const contactId = searchResponse.data.records[0].Id;
      await axios.patch(
        `${integrations.salesforce.instanceUrl}/services/data/v57.0/sobjects/Contact/${contactId}`,
        {
          FirstName: customerData.firstName,
          LastName: customerData.lastName,
          Phone: customerData.phone,
          VoxAssist_Last_Call_Date__c: new Date().toISOString()
        },
        {
          headers: {
            'Authorization': `Bearer ${integrations.salesforce.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      return { Id: contactId };
    } else {
      // Create new contact
      const createResponse = await axios.post(
        `${integrations.salesforce.instanceUrl}/services/data/v57.0/sobjects/Contact`,
        {
          FirstName: customerData.firstName,
          LastName: customerData.lastName,
          Email: customerData.email,
          Phone: customerData.phone,
          LeadSource: 'VoxAssist',
          VoxAssist_First_Call_Date__c: new Date().toISOString()
        },
        {
          headers: {
            'Authorization': `Bearer ${integrations.salesforce.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      return { Id: createResponse.data.id };
    }
  } catch (error) {
    logger.error('Error creating/updating Salesforce contact:', error);
    throw error;
  }
};

/**
 * Create Salesforce activity
 */
const createSalesforceActivity = async (callData, contactId) => {
  try {
    const response = await axios.post(
      `${integrations.salesforce.instanceUrl}/services/data/v57.0/sobjects/Task`,
      {
        Subject: `VoxAssist Call - ${callData.category}`,
        Description: `Call Duration: ${callData.duration}s\nStatus: ${callData.status}\nSentiment: ${callData.sentiment}\nSatisfaction: ${callData.satisfactionScore}/5\n\nTranscript: ${callData.transcript}`,
        ActivityDate: callData.startTime,
        Status: callData.status === 'completed' ? 'Completed' : 'In Progress',
        Priority: callData.status === 'escalated' ? 'High' : 'Normal',
        WhoId: contactId,
        Type: 'Call',
        CallType: 'Inbound',
        CallDurationInSeconds: callData.duration
      },
      {
        headers: {
          'Authorization': `Bearer ${integrations.salesforce.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return { Id: response.data.id };
  } catch (error) {
    logger.error('Error creating Salesforce activity:', error);
    throw error;
  }
};

/**
 * Sync call data to HubSpot
 */
const syncCallToHubSpot = async (callData) => {
  try {
    if (!integrations.hubspot.enabled) {
      throw new Error('HubSpot integration not enabled');
    }

    // Create or update contact
    const contact = await createOrUpdateHubSpotContact(callData.customer);
    
    // Create engagement (call activity)
    const engagement = await createHubSpotEngagement(callData, contact.vid);

    logger.info(`Call ${callData.id} synced to HubSpot successfully`);
    return { contact, engagement };
  } catch (error) {
    logger.error('Error syncing call to HubSpot:', error);
    throw error;
  }
};

/**
 * Create or update HubSpot contact
 */
const createOrUpdateHubSpotContact = async (customerData) => {
  try {
    // Search for existing contact
    const searchResponse = await axios.get(
      `https://api.hubapi.com/contacts/v1/contact/email/${customerData.email}/profile`,
      {
        headers: {
          'Authorization': `Bearer ${integrations.hubspot.accessToken}`
        }
      }
    ).catch(() => null);

    if (searchResponse && searchResponse.data) {
      // Update existing contact
      await axios.post(
        `https://api.hubapi.com/contacts/v1/contact/vid/${searchResponse.data.vid}/profile`,
        {
          properties: [
            { property: 'firstname', value: customerData.firstName },
            { property: 'lastname', value: customerData.lastName },
            { property: 'phone', value: customerData.phone },
            { property: 'voxassist_last_call_date', value: new Date().getTime() }
          ]
        },
        {
          headers: {
            'Authorization': `Bearer ${integrations.hubspot.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      return { vid: searchResponse.data.vid };
    } else {
      // Create new contact
      const createResponse = await axios.post(
        'https://api.hubapi.com/contacts/v1/contact',
        {
          properties: [
            { property: 'email', value: customerData.email },
            { property: 'firstname', value: customerData.firstName },
            { property: 'lastname', value: customerData.lastName },
            { property: 'phone', value: customerData.phone },
            { property: 'hs_lead_status', value: 'NEW' },
            { property: 'voxassist_first_call_date', value: new Date().getTime() }
          ]
        },
        {
          headers: {
            'Authorization': `Bearer ${integrations.hubspot.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      return { vid: createResponse.data.vid };
    }
  } catch (error) {
    logger.error('Error creating/updating HubSpot contact:', error);
    throw error;
  }
};

/**
 * Create HubSpot engagement
 */
const createHubSpotEngagement = async (callData, contactVid) => {
  try {
    const response = await axios.post(
      'https://api.hubapi.com/engagements/v1/engagements',
      {
        engagement: {
          active: true,
          type: 'CALL',
          timestamp: new Date(callData.startTime).getTime()
        },
        associations: {
          contactIds: [contactVid]
        },
        metadata: {
          toNumber: callData.customerPhone,
          fromNumber: callData.voxassistNumber,
          status: callData.status === 'completed' ? 'COMPLETED' : 'BUSY',
          durationMilliseconds: callData.duration * 1000,
          body: `VoxAssist AI Call\n\nCategory: ${callData.category}\nSentiment: ${callData.sentiment}\nSatisfaction: ${callData.satisfactionScore}/5\n\nTranscript: ${callData.transcript}`,
          disposition: callData.status === 'escalated' ? 'f240bbac-87c9-4f6e-bf80-dbed7ebfa781' : 'bcc5aa65-c3b4-4d2b-9c94-5b4c2c0b8c8a'
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${integrations.hubspot.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return { id: response.data.engagement.id };
  } catch (error) {
    logger.error('Error creating HubSpot engagement:', error);
    throw error;
  }
};

/**
 * Sync customer data from CRM
 */
const syncCustomerFromCRM = async (email, crmType = 'auto') => {
  try {
    let customerData = null;

    if (crmType === 'salesforce' || crmType === 'auto') {
      if (integrations.salesforce.enabled) {
        customerData = await getCustomerFromSalesforce(email);
        if (customerData) return customerData;
      }
    }

    if (crmType === 'hubspot' || crmType === 'auto') {
      if (integrations.hubspot.enabled) {
        customerData = await getCustomerFromHubSpot(email);
        if (customerData) return customerData;
      }
    }

    return null;
  } catch (error) {
    logger.error('Error syncing customer from CRM:', error);
    return null;
  }
};

/**
 * Get customer data from Salesforce
 */
const getCustomerFromSalesforce = async (email) => {
  try {
    const response = await axios.get(
      `${integrations.salesforce.instanceUrl}/services/data/v57.0/query/`,
      {
        headers: {
          'Authorization': `Bearer ${integrations.salesforce.accessToken}`
        },
        params: {
          q: `SELECT Id, FirstName, LastName, Email, Phone, Account.Name FROM Contact WHERE Email = '${email}' LIMIT 1`
        }
      }
    );

    if (response.data.records.length > 0) {
      const contact = response.data.records[0];
      return {
        crmId: contact.Id,
        crmType: 'salesforce',
        firstName: contact.FirstName,
        lastName: contact.LastName,
        email: contact.Email,
        phone: contact.Phone,
        company: contact.Account?.Name
      };
    }

    return null;
  } catch (error) {
    logger.error('Error getting customer from Salesforce:', error);
    return null;
  }
};

/**
 * Get customer data from HubSpot
 */
const getCustomerFromHubSpot = async (email) => {
  try {
    const response = await axios.get(
      `https://api.hubapi.com/contacts/v1/contact/email/${email}/profile`,
      {
        headers: {
          'Authorization': `Bearer ${integrations.hubspot.accessToken}`
        }
      }
    );

    if (response.data) {
      const contact = response.data;
      const properties = contact.properties;
      
      return {
        crmId: contact.vid,
        crmType: 'hubspot',
        firstName: properties.firstname?.value,
        lastName: properties.lastname?.value,
        email: properties.email?.value,
        phone: properties.phone?.value,
        company: properties.company?.value
      };
    }

    return null;
  } catch (error) {
    logger.error('Error getting customer from HubSpot:', error);
    return null;
  }
};

/**
 * Get CRM integration status
 */
const getCRMIntegrationStatus = () => {
  return {
    salesforce: {
      enabled: integrations.salesforce.enabled,
      connected: !!integrations.salesforce.accessToken
    },
    hubspot: {
      enabled: integrations.hubspot.enabled,
      connected: !!integrations.hubspot.accessToken
    }
  };
};

/**
 * Sync call to all enabled CRMs
 */
const syncCallToAllCRMs = async (callData) => {
  const results = {};

  try {
    if (integrations.salesforce.enabled) {
      results.salesforce = await syncCallToSalesforce(callData);
    }
  } catch (error) {
    results.salesforce = { error: error.message };
  }

  try {
    if (integrations.hubspot.enabled) {
      results.hubspot = await syncCallToHubSpot(callData);
    }
  } catch (error) {
    results.hubspot = { error: error.message };
  }

  return results;
};

/**
 * Create lead from call data
 */
const createLeadFromCall = async (callData, crmType = 'auto') => {
  try {
    if (crmType === 'salesforce' || crmType === 'auto') {
      if (integrations.salesforce.enabled) {
        return await createSalesforceLead(callData);
      }
    }

    if (crmType === 'hubspot' || crmType === 'auto') {
      if (integrations.hubspot.enabled) {
        return await createHubSpotLead(callData);
      }
    }

    throw new Error('No CRM integration available');
  } catch (error) {
    logger.error('Error creating lead from call:', error);
    throw error;
  }
};

/**
 * Create Salesforce lead
 */
const createSalesforceLead = async (callData) => {
  try {
    const response = await axios.post(
      `${integrations.salesforce.instanceUrl}/services/data/v57.0/sobjects/Lead`,
      {
        FirstName: callData.customer.firstName,
        LastName: callData.customer.lastName,
        Email: callData.customer.email,
        Phone: callData.customer.phone,
        Company: callData.customer.company || 'Unknown',
        LeadSource: 'VoxAssist',
        Status: 'New',
        Description: `Lead generated from VoxAssist call on ${new Date(callData.startTime).toLocaleDateString()}\n\nCall Category: ${callData.category}\nSentiment: ${callData.sentiment}\nSatisfaction: ${callData.satisfactionScore}/5`
      },
      {
        headers: {
          'Authorization': `Bearer ${integrations.salesforce.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return { id: response.data.id, crmType: 'salesforce' };
  } catch (error) {
    logger.error('Error creating Salesforce lead:', error);
    throw error;
  }
};

/**
 * Create HubSpot lead
 */
const createHubSpotLead = async (callData) => {
  try {
    const response = await axios.post(
      'https://api.hubapi.com/contacts/v1/contact',
      {
        properties: [
          { property: 'email', value: callData.customer.email },
          { property: 'firstname', value: callData.customer.firstName },
          { property: 'lastname', value: callData.customer.lastName },
          { property: 'phone', value: callData.customer.phone },
          { property: 'company', value: callData.customer.company || 'Unknown' },
          { property: 'hs_lead_status', value: 'NEW' },
          { property: 'lifecyclestage', value: 'lead' },
          { property: 'lead_source', value: 'VoxAssist' }
        ]
      },
      {
        headers: {
          'Authorization': `Bearer ${integrations.hubspot.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return { id: response.data.vid, crmType: 'hubspot' };
  } catch (error) {
    logger.error('Error creating HubSpot lead:', error);
    throw error;
  }
};

module.exports = {
  initializeCRMIntegrations,
  syncCallToSalesforce,
  syncCallToHubSpot,
  syncCallToAllCRMs,
  syncCustomerFromCRM,
  getCRMIntegrationStatus,
  createLeadFromCall,
  refreshSalesforceToken
};
