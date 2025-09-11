import apiClient from '@/lib/api';

export interface Contact {
  id: number;
  organizationId: number;
  name: string;
  email?: string;
  phone: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  _count?: {
    calls: number;
    campaigns: number;
  };
}

export interface CreateContactData {
  name: string;
  phone: string;
  email?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateContactData {
  name?: string;
  phone?: string;
  email?: string;
  metadata?: Record<string, unknown>;
}

export interface ContactsResponse {
  contacts: Contact[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface BulkCreateResponse {
  created: number;
  attempted: number;
  skipped: number;
}

export class ContactsService {
  // Get all contacts with pagination and search
  static async getContacts(params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<ContactsResponse> {
    const queryParams = new URLSearchParams();
    
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);

    const response = await apiClient.get<ContactsResponse>(
      `/contacts?${queryParams.toString()}`
    );
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.error || 'Failed to fetch contacts');
  }

  // Create a new contact
  static async createContact(contactData: CreateContactData): Promise<Contact> {
    const response = await apiClient.post<Contact>('/contacts', contactData);
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.error || 'Failed to create contact');
  }

  // Get a specific contact by ID
  static async getContact(id: number): Promise<Contact> {
    const response = await apiClient.get<Contact>(`/contacts/${id}`);
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.error || 'Failed to fetch contact');
  }

  // Update a contact
  static async updateContact(id: number, contactData: UpdateContactData): Promise<Contact> {
    const response = await apiClient.put<Contact>(`/contacts/${id}`, contactData);
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.error || 'Failed to update contact');
  }

  // Delete a contact
  static async deleteContact(id: number): Promise<void> {
    const response = await apiClient.delete(`/contacts/${id}`);
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to delete contact');
    }
  }

  // Bulk create contacts
  static async bulkCreateContacts(contacts: CreateContactData[]): Promise<BulkCreateResponse> {
    const response = await apiClient.post<BulkCreateResponse>('/contacts/bulk', {
      contacts
    });
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.error || 'Failed to bulk create contacts');
  }

  // Search contacts
  static async searchContacts(query: string, limit = 10): Promise<Contact[]> {
    const response = await this.getContacts({
      search: query,
      limit,
      page: 1
    });
    
    return response.contacts;
  }

  // Get contact statistics
  static async getContactStats(): Promise<{
    total: number;
    withCalls: number;
    withCampaigns: number;
    recentlyAdded: number;
  }> {
    try {
      // Get all contacts to calculate stats
      const response = await this.getContacts({ limit: 1000 });
      const contacts = response.contacts;
      
      const stats = {
        total: response.pagination.total,
        withCalls: contacts.filter(c => c._count && c._count.calls > 0).length,
        withCampaigns: contacts.filter(c => c._count && c._count.campaigns > 0).length,
        recentlyAdded: contacts.filter(c => {
          const createdAt = new Date(c.createdAt);
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          return createdAt > weekAgo;
        }).length
      };
      
      return stats;
    } catch (error) {
      console.error('Failed to get contact stats:', error);
      return {
        total: 0,
        withCalls: 0,
        withCampaigns: 0,
        recentlyAdded: 0
      };
    }
  }

  // Validate contact data
  static validateContact(contactData: CreateContactData | UpdateContactData): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    
    // Name validation (required for create)
    if ('name' in contactData && contactData.name !== undefined) {
      if (!contactData.name || !contactData.name.trim()) {
        errors.push('Name is required');
      } else if (contactData.name.trim().length < 2) {
        errors.push('Name must be at least 2 characters long');
      }
    }
    
    // Phone validation (required for create)
    if ('phone' in contactData && contactData.phone !== undefined) {
      if (!contactData.phone) {
        errors.push('Phone number is required');
      } else {
        const phoneRegex = /^\+?[1-9]\d{1,14}$/;
        const cleanPhone = contactData.phone.replace(/[\s\-\(\)]/g, '');
        if (!phoneRegex.test(cleanPhone)) {
          errors.push('Invalid phone number format');
        }
      }
    }
    
    // Email validation (optional)
    if (contactData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(contactData.email)) {
        errors.push('Invalid email format');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Format phone number for display
  static formatPhoneNumber(phone: string): string {
    // Remove all non-digit characters except +
    const cleaned = phone.replace(/[^\d+]/g, '');
    
    // If it starts with +1 (US/Canada), format as +1 (XXX) XXX-XXXX
    if (cleaned.startsWith('+1') && cleaned.length === 12) {
      return `+1 (${cleaned.slice(2, 5)}) ${cleaned.slice(5, 8)}-${cleaned.slice(8)}`;
    }
    
    // If it's a 10-digit US number without country code
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    
    // For international numbers, just return as-is with proper spacing
    if (cleaned.startsWith('+')) {
      return cleaned.replace(/(\+\d{1,3})(\d{3})(\d{3})(\d+)/, '$1 $2 $3 $4');
    }
    
    return phone; // Return original if no formatting rules match
  }

  // Parse contact from CSV/import format
  static parseContactFromCSV(csvRow: string[]): CreateContactData | null {
    try {
      // Assuming CSV format: Name, Phone, Email
      const [name, phone, email] = csvRow;
      
      if (!name || !phone) {
        return null;
      }
      
      const contactData: CreateContactData = {
        name: name.trim(),
        phone: phone.trim(),
        email: email ? email.trim() : undefined
      };
      
      const validation = this.validateContact(contactData);
      if (!validation.isValid) {
        console.warn('Invalid contact data:', validation.errors);
        return null;
      }
      
      return contactData;
    } catch (error) {
      console.error('Error parsing contact from CSV:', error);
      return null;
    }
  }

  // Export contacts to CSV format
  static exportToCSV(contacts: Contact[]): string {
    const headers = ['Name', 'Phone', 'Email', 'Created At', 'Calls Count', 'Campaigns Count'];
    const csvRows = [headers.join(',')];
    
    contacts.forEach(contact => {
      const row = [
        `"${contact.name}"`,
        `"${contact.phone}"`,
        `"${contact.email || ''}"`,
        `"${new Date(contact.createdAt).toLocaleDateString()}"`,
        contact._count?.calls || 0,
        contact._count?.campaigns || 0
      ];
      csvRows.push(row.join(','));
    });
    
    return csvRows.join('\n');
  }
}
