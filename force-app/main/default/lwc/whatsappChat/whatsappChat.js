import { LightningElement, track, api } from 'lwc';
import getContact from '@salesforce/apex/WhatsAppController.getContact';
import getMessages from '@salesforce/apex/WhatsAppController.getMessages';
import sendMessage from '@salesforce/apex/WhatsAppController.sendMessage';
import getLastSeen from '@salesforce/apex/WhatsAppController.getLastSeen';

import { subscribe, unsubscribe } from 'lightning/empApi';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class WhatsappChat extends LightningElement {
    @api recordId;
    @track messages = [];
    @track newMessage = '';
    @track isTyping = false;

    phone = '919579377280';    // default phone number
    name = 'WhatsApp Chat';
    firstName = '';
    lastName = '';
    status = 'online';
    avatarUrl = '';
    avatarInitial = 'WC';
    phoneNumber = '';
    contactId = '';

    channelName = '/event/WhatsApp_Message_Event__e';
    subscription = {};
    typingTimeout = null;

    lastSeen;
    lastSeenLabel;

    connectedCallback() {
        debugger;
        console.log('Initial recordId from @api: ', this.recordId);

        // If recordId is not provided via @api, try to get it from URL
        if (!this.recordId) {
            this.recordId = this.getRecordIdFromUrl();
            console.log('recordId from URL: ', this.recordId);
        }

        console.log('Final recordId value: ', this.recordId);

        if (this.recordId) {
            // Running from Contact page
            getContact({ contactId: this.recordId })
                .then(con => {
                    console.log('Contact retrieved:', con);
                    this.selectedContact = con;
                    this.phone = this.formatPhone(con.Phone);
                    this.phoneNumber = con.Phone;
                    this.name = con.Name ? con.Name : 'WhatsApp Chat';
                    this.firstName = con.FirstName;
                    this.lastName = con.LastName;
                    this.contactId = con.Id;
                    this.avatarInitial = this.getAvatarInitial();
                    this.loadMessages();
                    this.loadLastSeen();
                    this.subscribeToEvent();
                })
                .catch(error => {
                    console.error('Error getting contact:', error);
                    // Fallback to default phone if there's an error
                    this.loadMessages();
                });
        } else {
            // Standalone mode - no recordId found
            console.log('--------- no record id found --------');
            this.loadMessages();
        }
    }

    // Method to extract recordId from URL parameters
    getRecordIdFromUrl() {
        try {
            // Get the current URL
            const currentUrl = window.location.href;
            console.log('Current URL:', currentUrl);

            // Method 1: Using URLSearchParams
            const urlParams = new URLSearchParams(window.location.search);
            let recordId = urlParams.get('recordId');

            if (recordId) {
                return recordId;
            }

            // Method 2: For Lightning Experience record pages
            // URL pattern: /lightning/r/Contact/003XXXXXXXXXXXXXXX/view
            const recordPageMatch = currentUrl.match(/\/lightning\/r\/Contact\/([a-zA-Z0-9]{15,18})\/view/);
            if (recordPageMatch && recordPageMatch[1]) {
                return recordPageMatch[1];
            }

            // Method 3: For classic or other URL patterns
            const urlParts = currentUrl.split('/');
            for (let part of urlParts) {
                // Check if the part looks like a Salesforce record ID (starts with 003 for Contact)
                if (part && part.length >= 15 && part.length <= 18 && /^[a-zA-Z0-9]{15,18}$/.test(part)) {
                    // Check if it's a Contact ID (starts with 003)
                    if (part.startsWith('003')) {
                        return part;
                    }
                }
            }

            // Method 4: Check hash parameters (for some Salesforce configurations)
            if (window.location.hash) {
                const hashParams = new URLSearchParams(window.location.hash.substring(1));
                recordId = hashParams.get('recordId');
                if (recordId) {
                    return recordId;
                }
            }

            return null;
        } catch (error) {
            console.error('Error extracting recordId from URL:', error);
            return null;
        }
    }

    getAvatarInitial() {
        if (this.firstName && this.lastName) {
            return (this.firstName.charAt(0) + this.lastName.charAt(0)).toUpperCase();
        } else if (this.name) {
            return this.name.charAt(0).toUpperCase();
        }
        return 'WC';
    }

    loadLastSeen() {
        getLastSeen({ phone: this.phone })
            .then(result => {
                this.lastSeen = result;
                this.lastSeenLabel = this.formatLastSeen(result);
            })
            .catch(error => {
                console.error('Error fetching last seen:', error);
            });
    }

    /*
    subscribeToEvent() {
        subscribe(this.channelName, -1, (event) => {
            const payload = event.data.payload;

            if (payload.Phone__c === this.phone) {
                const messageId = payload.Message_Id__c;

                if (!messageId) {
                    console.warn('Missing Message_Id__c in event');
                    return;
                }

                // 🔍 Check if message already exists
                const existingIndex = this.messages.findIndex(msg => msg.Id === messageId);

                if (existingIndex !== -1) {
                    // ✅ UPDATE existing message (STATUS UPDATE)
                    let updatedMessages = [...this.messages];

                    updatedMessages[existingIndex] = {
                        ...updatedMessages[existingIndex],
                        Message_Delivery_Status__c: this.normalizeDeliveryStatus(payload.WhatsApp_Delivery_Status__c),
                        statusLabel: this.getStatusLabel(payload.WhatsApp_Delivery_Status__c),
                        statusClass: this.getStatusClass(payload.WhatsApp_Delivery_Status__c),
                        statusIcon: this.getStatusIcon(payload.WhatsApp_Delivery_Status__c)
                    };

                    this.messages = updatedMessages;
                } else {
                    // ✅ NEW MESSAGE
                    const newMsg = this.createMessageObject(
                        messageId,
                        payload.Message__c,
                        payload.Direction__c,
                        new Date(),
                        payload.WhatsApp_Delivery_Status__c
                    );

                    this.messages = [...this.messages, newMsg];
                }

                this.scrollToBottom();
            }
        }).then(response => {
            this.subscription = response;
        }).catch(error => {
            console.error('Error subscribing to event:', error);
        });
    }
    */
    subscribeToEvent() {
        subscribe(this.channelName, -1, (event) => {
            const payload = event.data.payload;

            if (payload.Direction__c === 'Inbound') {
                this.lastSeen = new Date();
                this.lastSeenLabel = this.formatLastSeen(this.lastSeen);
            }

            if (payload.Phone__c !== this.phone) return;

            const messageId = payload.Message_Id__c;
            const status = payload.WhatsApp_Delivery_Status__c;

            let replaced = false;

            // 🔁 STEP 1 — Replace TEMP message
            this.messages = this.messages.map(msg => {
                if (
                    msg.Id && msg.Id.startsWith('temp_') &&
                    msg.Message_Text__c === payload.Message__c &&
                    msg.Direction__c === payload.Direction__c
                ) {
                    replaced = true;

                    return {
                        ...msg,
                        Id: messageId,
                        Message_Delivery_Status__c: this.normalizeDeliveryStatus(status),
                        statusLabel: this.getStatusLabel(status),
                        statusClass: this.getStatusClass(status),
                        statusIcon: this.getStatusIcon(status)
                    };
                }
                return msg;
            });

            // 🔁 STEP 2 — If already exists → update status
            if (!replaced) {
                const existingIndex = this.messages.findIndex(msg => msg.Id === messageId);

                if (existingIndex !== -1) {
                    let updatedMessages = [...this.messages];

                    updatedMessages[existingIndex] = {
                        ...updatedMessages[existingIndex],
                        Message_Delivery_Status__c: this.normalizeDeliveryStatus(status),
                        statusLabel: this.getStatusLabel(status),
                        statusClass: this.getStatusClass(status),
                        statusIcon: this.getStatusIcon(status)
                    };

                    this.messages = updatedMessages;
                } else {
                    // 🔁 STEP 3 — New message (inbound case)
                    const newMsg = this.createMessageObject(
                        messageId,
                        payload.Message__c,
                        payload.Direction__c,
                        new Date(),
                        status
                    );

                    this.messages = [...this.messages, newMsg];
                }
            }

            this.scrollToBottom();
        });
    }
    disconnectedCallback() {
        if (this.subscription && this.subscription.unsubscribe) {
            unsubscribe(this.subscription);
        }
        if (this.typingTimeout) {
            clearTimeout(this.typingTimeout);
        }
    }

    loadMessages() {
        debugger;
        getMessages({ phone: this.phone })
            .then(result => {
                const serverMessages = result.map(msg => {
                    return this.createMessageObject(
                        msg.Id, // Message ID
                        msg.Message_Text__c,
                        msg.Direction__c,
                        msg.CreatedDate,
                        msg.Message_Delivery_Status__c
                    );
                });

                // Preserve any pending/outgoing messages if needed
                // For now, just replace
                this.messages = [...serverMessages];
                console.log('Messages loaded from server count:', this.messages.length);
                console.log('Messages loaded from server data:', JSON.stringify(this.messages));
                this.scrollToBottom();
            })
            .catch(error => {
                console.error('Error loading messages:', error);
            });
    }

    createMessageObject(id, text, direction, timestamp, messageDeliveryStatus) {
        const isOutbound = direction === 'Outbound';
        const normalizedStatus = this.normalizeDeliveryStatus(messageDeliveryStatus);
        const statusIcon = isOutbound ? this.getStatusIcon(normalizedStatus) : '';

        return {
            Id: id, // Message ID
            Message_Text__c: text,
            Direction__c: direction,
            cssClass: direction === 'Inbound' ? 'msg inbound' : 'msg outbound',
            time: this.formatTime(timestamp),
            isOutbound: isOutbound,
            isInbound: direction === 'Inbound',
            Message_Delivery_Status__c: normalizedStatus,
            statusLabel: this.getStatusLabel(normalizedStatus),
            statusClass: this.getStatusClass(normalizedStatus),
            statusIcon: statusIcon
        };
    }

    normalizeDeliveryStatus(statusValue) {
        if (!statusValue) {
            return 'sent';
        }
        return String(statusValue).trim().toLowerCase();
    }

    getStatusIcon(status) {
        switch (status) {
            case 'delivered':
                return '✓✓';
            case 'read':
                return '✓✓';
            case 'failed':
                return '!';
            case 'sent':
            default:
                return '✓';
        }
    }

    getStatusLabel(status) {
        switch (status) {
            case 'read':
                return 'Read';
            case 'delivered':
                return 'Delivered';
            case 'failed':
                return 'Failed';
            case 'sent':
            default:
                return 'Sent';
        }
    }

    getStatusClass(status) {
        return status === 'read' ? 'message-status message-status-read' : 'message-status';
    }

    handleChange(event) {
        this.newMessage = event.target.value;
        this.showTypingIndicator();
    }

    showTypingIndicator() {
        this.isTyping = true;
        // Clear typing indicator after 2 seconds of no typing
        if (this.typingTimeout) {
            clearTimeout(this.typingTimeout);
        }
        this.typingTimeout = setTimeout(() => {
            this.isTyping = false;
        }, 2000);
    }

    handleKeyPress(event) {
        if (event.key === 'Enter' && this.newMessage) {
            this.handleSend();
        }
    }

    handleSend() {
        debugger;
        if (!this.newMessage || !this.selectedContact) {
            return;
        }

        const messageText = this.newMessage;
        const tempId = 'temp_' + Date.now() + '_' + Math.random();

        // Create temp message
        const tempMessage = {
            Id: tempId,
            Message_Text__c: messageText,
            Direction__c: 'Outbound',
            cssClass: 'msg outbound',
            time: this.formatTime(new Date()),
            isOutbound: true,
            isInbound: false,
            Message_Delivery_Status__c: 'sending',
            statusLabel: 'Sending...',
            statusClass: 'message-status',
            statusIcon: '⌛'
        };

        // Add temp message
        this.messages = [...this.messages, tempMessage];
        console.log('Messages after adding temp message:', this.messages);
        // this.renderMessages();
        this.scrollToBottom();

        // Clear input
        const messageToSend = this.newMessage;
        this.newMessage = '';
        const textarea = this.template.querySelector('textarea');
        if (textarea) textarea.value = '';

        // Send API call using Meta API
        sendMessage({
            phone: this.selectedContact.Phone,
            message: messageToSend,
            contactId: this.selectedContact.Id
        })
            .then(() => {
                console.log('Message sent successfully');
                // Just update the status, don't reload all messages
                this.messages = this.messages.map(msg => {
                    if (msg.Id === tempId) {
                        return {
                            ...msg,
                            Message_Delivery_Status__c: 'sent',
                            statusLabel: 'Sent',
                            statusIcon: '✓'
                        };
                    }
                    return msg;
                });
                // this.renderMessages();

                // Optional: reload after 3 seconds to get the real message ID (without clearing UI)
                setTimeout(() => {
                    this.smartReload(tempId);
                }, 3000);
            })
            .catch(error => {
                console.error('Error sending message:', error);
                this.messages = this.messages.map(msg => {
                    if (msg.Id === tempId) {
                        return {
                            ...msg,
                            Message_Delivery_Status__c: 'failed',
                            statusLabel: 'Failed',
                            statusIcon: '⚠️'
                        };
                    }
                    return msg;
                });
                // this.renderMessages();
                this.showToast('Error', 'Message failed to send', 'error');
            });
    }

    // Smart reload - only add messages that don't already exist
    smartReload(tempId) {
        if (!this.selectedContact) return;

        getMessages({ phone: this.selectedContact.Phone })
            .then(result => {
                const existingMessageIds = new Set(this.messages.map(m => m.Id));
                const newMessages = [];

                for (const serverMsg of result) {
                    if (!existingMessageIds.has(serverMsg.Id)) {
                        newMessages.push(this.createMessageObject(serverMsg));
                    }
                }

                if (newMessages.length > 0) {
                    // Remove temp message if found in server
                    let finalMessages = this.messages.filter(m => m.Id !== tempId);
                    finalMessages = [...finalMessages, ...newMessages];
                    finalMessages.sort((a, b) => new Date(a.time) - new Date(b.time));
                    this.messages = finalMessages;
                    // this.renderMessages();
                }
            })
            .catch(error => console.error('Smart reload error:', error));
    }

    showErrorToast(message) {
        // You can implement toast notification here
        console.error(message);
    }

    formatTime(date) {
        const d = new Date(date);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    scrollToBottom() {
        setTimeout(() => {
            const container = this.template.querySelector('.chat-body');
            if (container) {
                container.scrollTop = container.scrollHeight;
            }
        }, 100);
    }

    formatPhone(phone) {
        if (!phone) return null;
        // Remove spaces, +, etc., but keep the number
        return phone.replace(/\D/g, '');
    }

    // Header action handlers
    handleVideoCall() {
        console.log('Video call initiated');
        // Add your video call logic here
    }

    handleMenuClick() {
        console.log('Menu clicked');
        // Add menu options logic here
    }

    handleEmojiClick() {
        console.log('Emoji picker clicked');
        // Add emoji picker logic here
    }

    get isSendDisabled() {
        return !this.newMessage || this.newMessage.trim() === '';
    }

    showToast(title, message, variant) {
        this.dispatchEvent(
            new ShowToastEvent({
                title,
                message,
                variant
            })
        );
    }

    formatLastSeen(dateTime) {

        if (!dateTime) {
            return 'Last seen not available';
        }

        const now = new Date();
        const lastSeenDate = new Date(dateTime);

        const diffMs = now - lastSeenDate;
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

        // Just now
        if (diffMinutes < 1) {
            return 'Last seen just now';
        }

        // Minutes ago
        if (diffMinutes < 60) {
            return `Last seen ${diffMinutes} min ago`;
        }

        // Hours ago
        if (diffHours < 24) {
            return `Last seen ${diffHours} hour(s) ago`;
        }

        // Yesterday
        const yesterday = new Date();
        yesterday.setDate(now.getDate() - 1);

        if (lastSeenDate.toDateString() === yesterday.toDateString()) {
            return `Last seen yesterday at ${this.formatTime(dateTime)}`;
        }

        // Older
        return `Last seen on ${lastSeenDate.toLocaleDateString()} at ${this.formatTime(dateTime)}`;
    }

    // handleSend() {
    //     if (!this.newMessage || this.newMessage.trim() === '') {
    //         console.log('Message is empty, not sending');
    //         return;
    //     }

    //     const messageText = this.newMessage;
    //     const tempId = Date.now();

    //     console.log('Sending message:', messageText);
    //     console.log('Current messages count:', this.messages.length);

    //     // Create temp message object
    //     const tempMessage = {
    //         Id: tempId,
    //         Message_Text__c: messageText,
    //         Direction__c: 'Outbound',
    //         cssClass: 'msg outbound',
    //         time: this.formatTime(new Date()),
    //         isOutbound: true,
    //         isInbound: false,
    //         isDelivered: false,
    //         isRead: false,
    //         statusIcon: '✓'
    //     };

    //     // Add to UI immediately
    //     this.messages = [...this.messages, tempMessage];
    //     console.log('Temp message added, new count:', this.messages.length);

    //     this.scrollToBottom();
    //     this.newMessage = '';
    //     this.isTyping = false;

    //     // Send to server
    //     sendMessage({
    //         phone: this.phone,
    //         message: messageText
    //     })
    //         .then(() => {
    //             console.log('Message sent successfully, reloading messages');
    //             // Reload messages to get updated status
    //             this.loadMessages();
    //         })
    //         .catch(error => {
    //             console.error('Error sending message:', error);
    //             // Remove temp message on failure
    //             this.messages = this.messages.filter(msg => msg.Id !== tempId);
    //             this.showErrorToast('Failed to send message');
    //         });
    // }
}