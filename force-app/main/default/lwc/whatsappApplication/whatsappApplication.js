import { LightningElement, track } from 'lwc';
import getContactsPaginated from '@salesforce/apex/WhatsAppController.getContactsPaginated';
import searchContacts from '@salesforce/apex/WhatsAppController.searchContacts';
import getMessages from '@salesforce/apex/WhatsAppController.getMessages2';
import sendMessage from '@salesforce/apex/WhatsAppController.sendMessage';
import getLastSeen from '@salesforce/apex/WhatsAppController.getLastSeen';
import markChatAsRead from '@salesforce/apex/WhatsAppController.markChatAsRead';
import { subscribe } from 'lightning/empApi';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';


export default class WhatsappApp extends LightningElement {

    // ================= STATE =================
    @track contacts = [];
    @track filteredContacts = [];
    @track selectedContact;
    @track searchTerm = '';

    @track selectedContactsMap = new Map();
    @track showModal = false;
    @track bulkMessage = '';

    @track messages = [];
    newMessage = '';
    lastSeenLabel = '';

    channelName = '/event/WhatsApp_Message_Event__e';

    pageSize = 200;
    lastContactId = null;
    isLoading = false;
    hasMoreData = true;

    isSearchMode = false;
    onlineTimeout;

    // ================= INIT =================
    connectedCallback() {

        try {
            const savedTheme = window.localStorage.getItem('wa-theme');
            this.isDarkMode = savedTheme === 'dark';
        } catch (e) {
            // Ignore localStorage issues in restricted environments
        }

        this.loadContacts();
        this.subscribeToEvent();
    }

    // ================= CONTACT LOAD =================
    // loadContacts() {
    //     getAllContacts()
    //         .then(data => {

    //             this.contacts = data.map(c => ({
    //                 ...c,
    //                 initials: this.getInitials(c.Name),
    //                 selected: false,
    //                 lastMessage: '',
    //                 lastMessageTime: '',
    //                 unreadCount: 0,
    //                 isOnline: false
    //             }));

    //             this.filteredContacts = [...this.contacts];

    //         });
    // }

    // loadContacts() {

    //     if (this.isLoading || !this.hasMoreData) return;

    //     this.isLoading = true;

    //     getContactsPaginated({
    //         lastContactId: this.lastContactId,
    //         limitSize: this.pageSize
    //     })
    //         .then(data => {

    //             if (!data.length) {
    //                 this.hasMoreData = false;
    //                 return;
    //             }

    //             const newContacts = data.map(c => ({
    //                 ...c,
    //                 initials: this.getInitials(c.Name),
    //                 selected: false,
    //                 cssClass: 'contact-item',
    //                 lastMessage: '',
    //                 lastMessageTime: '',
    //                 unreadCount: 0,
    //                 isOnline: false,
    //                 onlineClass: 'online-dot offline'
    //             }));

    //             this.contacts = [...this.contacts, ...newContacts];
    //             this.filteredContacts = [...this.contacts];

    //             // store last record
    //             this.lastContactId = data[data.length - 1].Id;
    //         })
    //         .finally(() => {
    //             this.isLoading = false;
    //         });
    // }

    loadContacts() {

        if (this.isLoading || !this.hasMoreData) return;

        this.isLoading = true;

        getContactsPaginated({
            lastContactId: this.lastContactId,
            limitSize: this.pageSize
        })
            .then(data => {

                if (!data.length) {
                    this.hasMoreData = false;
                    return;
                }

                const newContacts = data.map(w => ({
                    ...w.contact,
                    initials: this.getInitials(w.contact.Name),
                    selected: false,
                    cssClass: 'contact-item',
                    lastMessage: w.lastMessage || '',
                    lastMessageTime: w.lastMessageTime ? this.formatTime(w.lastMessageTime) : '',
                    phone: w.phone || '',
                    hasUnreadMessages: w.hasUnreadMessages || false,
                    unreadCount: w.unreadCount || 0,
                    isOnline: false,
                    onlineClass: false,
                    messageClass: w.hasUnreadMessages ? 'contact-last-message unread' : 'contact-last-message read',
                    timeClass: w.hasUnreadMessages ? 'message-time unread' : 'message-time read'
                }));

                console.log('newContacts', JSON.stringify(newContacts));

                this.contacts = [...this.contacts, ...newContacts];
                this.filteredContacts = [...this.contacts];

                // store last record
                this.lastContactId = data[data.length - 1].contact.Id;
            })
            .finally(() => {
                this.isLoading = false;
            });
    }

    renderedCallback() {

        if (this._scrollInitialized) return;

        const container = this.template.querySelector('.contact-list');

        if (container) {
            container.addEventListener('scroll', this.handleScroll.bind(this));
            this._scrollInitialized = true;
        }
    }

    handleScroll(event) {

        // Do NOT paginate during search
        if (this.isSearchMode) return;

        const el = event.target;

        const isNearBottom =
            el.scrollTop + el.clientHeight >= el.scrollHeight - 50;

        if (isNearBottom) {
            this.loadContacts();
        }
    }
    // handleScroll(event) {

    //     const el = event.target;

    //     const isNearBottom =
    //         el.scrollTop + el.clientHeight >= el.scrollHeight - 50;

    //     if (isNearBottom) {
    //         this.loadContacts(); // load next batch
    //     }
    // }

    // ================= SEARCH =================

    handleSearchChange(event) {
        debugger;

        const value = event.target.value;
        debugger;
        console.log('value', value);
        console.log('this.isSearchMode', this.isSearchMode);

        this.searchTerm = value;
        console.log('this.searchTerm', this.searchTerm);

        // If search is cleared → go back to normal mode
        if (!value || !value.trim()) {
            this.isSearchMode = false;

            this.filteredContacts = [...this.contacts];
            return;
        }

        this.isSearchMode = true;

        // Call Apex search
        searchContacts({ searchTerm: value })
            .then(data => {

                this.filteredContacts = data.map(c => ({
                    ...c,
                    initials: this.getInitials(c.Name),
                    selected: false,
                    cssClass: 'contact-item',
                    lastMessage: '',
                    lastMessageTime: '',
                    unreadCount: 0,
                    isOnline: false,
                    onlineClass: 'online-dot offline'
                }));


            })
            .catch(error => {
                console.error('Search error', error);
            });
    }
    // handleSearchChange(event) {
    //     this.searchTerm = event.target.value.toLowerCase();

    //     this.filteredContacts = this.contacts.filter(c =>
    //         c.Name.toLowerCase().includes(this.searchTerm) ||
    //         (c.Phone && c.Phone.includes(this.searchTerm))
    //     );
    // }

    // ================= SELECT CONTACT =================
    handleContactSelect(event) {
        debugger;
        const contactId = event.currentTarget.dataset.id;

        // =========================
        // 1. Update selectedContact
        // =========================
        const contact = this.filteredContacts.find(c => c.Id === contactId);
        this.selectedContact = contact;

        // ============================================
        // Mark current contact as read in UI
        // ============================================

        this.contacts = this.contacts.map(c => {

            if (c.Id === contactId) {

                return {
                    ...c,
                    hasUnreadMessages: false,
                    unreadCount: 0,
                    messageClass: 'contact-last-message read',
                    timeClass: 'message-time read'
                };
            }
            return c;
        });

        // ============================================
        // Sync filtered list
        // ============================================

        this.filteredContacts =
            this.filteredContacts.map(c => {

                if (c.Id === contactId) {

                    return {
                        ...c,

                        hasUnreadMessages: false,

                        unreadCount: 0,

                        messageClass:
                            'contact-last-message read',

                        timeClass:
                            'message-time read'
                    };
                }

                return c;
            });

        // =========================
        // 2. Update UI highlight
        // =========================
        this.filteredContacts = this.filteredContacts.map(c => {
            return {
                ...c,
                //selected: c.Id === contactId,
                cssClass: c.Id === contactId ? 'contact-item selected' : 'contact-item'
            };
        });

        // =========================
        // 3. Sync master list
        // =========================
        this.contacts = this.contacts.map(c => {
            return {
                ...c,
                //selected: c.Id === contactId,
                cssClass: c.Id === contactId ? 'contact-item selected' : 'contact-item'
            };
        });

        // =========================
        // 4. Mark chat as read
        // =========================
        markChatAsRead({ contact_id: contactId, phone: this.selectedContact.Phone })
            .then(() => {
                console.log('Chat marked as read');
            })
            .catch(error => {
                console.error('Error marking chat as read', error);
            });

        // =========================
        // 5. Load data
        // =========================
        this.loadMessages();
        this.loadLastSeen();

        // =========================
        // 6. Reset unread
        // =========================
        if (contact) {
            contact.unreadCount = 0;
        }
    }

    handleCheckboxClick(event) {
        debugger;
        event.stopPropagation();
        debugger;

        const id = event.target.dataset.id;

        // IMPORTANT: use checked value (NOT toggle)
        const isChecked = event.target.checked;

        // =========================
        // 1. Update filteredContacts (UI)
        // =========================
        this.filteredContacts = this.filteredContacts.map(c => {
            if (c.Id === id) {

                const updated = { ...c, selected: isChecked };

                if (isChecked) {
                    this.selectedContactsMap.set(id, updated);
                } else {
                    this.selectedContactsMap.delete(id);
                }

                return updated;
            }
            return c;
        });

        // =========================
        // 2. Sync master list
        // =========================
        this.contacts = this.contacts.map(c => {
            if (c.Id === id) {
                return { ...c, selected: isChecked };
            }
            return c;
        });
    }

    get selectedCount() {
        return this.selectedContactsMap.size;
    }

    get showBulkBar() {
        return this.selectedCount > 0;
    }

    get selectedContactsList() {
        return Array.from(this.selectedContactsMap.values());
    }

    // ================= LOAD MESSAGES =================
    loadMessages() {
        getMessages({ phone: this.selectedContact.Phone })
            .then(data => {
                // this.messages = (data || []).map(m => this.formatMessage(m));
                const formatted = (data || []).map(m => this.formatMessage(m));

                this.messages = this.prepareMessagesWithDate(formatted);
                this.scrollToBottom();
            });
    }

    // ================= MANUAL DOM RENDER =================
    /*
    renderMessages() {
        debugger;
        const container = this.template.querySelector('.chat-body');
    
        if (!container) {
            console.error('chat-body not found');
            return;
        }
    
        container.innerHTML = '';
    
        if (!this.messages.length) {
            container.innerHTML = `<div class="no-messages-placeholder"><p>No messages yet</p></div>`;
            return;
        }
    
        this.messages.forEach(msg => {
    
            const wrapper = document.createElement('div');
            wrapper.className = `msg ${msg.Direction__c === 'Inbound' ? 'inbound' : 'outbound'}`;
    
            const bubble = document.createElement('div');
            bubble.className = 'message-bubble';
    
            const text = document.createElement('div');
            text.className = 'message-text';
            text.innerText = msg.Message_Text__c;
    
            const meta = document.createElement('div');
            meta.className = 'message-meta';
    
            meta.innerHTML = `
                <span>${this.formatTime(msg.CreatedDate)}</span>
                <span class="message-status ${msg.Message_Delivery_Status__c === 'read' ? 'message-status-read' : ''}">
                    ${this.getStatusIcon(msg.Message_Delivery_Status__c)}
                </span>
            `;
    
            bubble.appendChild(text);
            bubble.appendChild(meta);
            wrapper.appendChild(bubble);
    
            container.appendChild(wrapper);
        });
    
        this.scrollToBottom();
    }
    */

    formatMessage(msg) {

        const isOutbound = msg.Direction__c === 'Outbound';
        const status = msg.Message_Delivery_Status__c;

        return {
            ...msg,
            cssClass: `msg ${isOutbound ? 'outbound' : 'inbound'}`,
            time: this.formatTime(msg.CreatedDate),
            statusIcon: this.getStatusIcon(status),
            isRead: status === 'read',
            statusClass: this.getStatusClass(status)
        };
    }


    // ================= SEND =================
    handleSend() {

        if (!this.newMessage) return;

        const messageText = this.newMessage; // store value safely

        const tempId = 'temp_' + Date.now() + '_' + Math.random();

        const tempMsg = this.formatMessage({
            Id: tempId,
            Message_Text__c: messageText,
            Direction__c: 'Outbound',
            Message_Delivery_Status__c: 'sent',
            CreatedDate: new Date()
        });

        // Add temp message
        // this.messages = [...this.messages, tempMsg];

        const onlyMessages = this.messages.filter(m => m.type === 'message');

        const updated = [...onlyMessages, tempMsg];

        this.messages = this.prepareMessagesWithDate(updated);

        this.scrollToBottom();

        sendMessage({
            phone: this.selectedContact.Phone,
            message: messageText,
            contactId: this.selectedContact.Id
        })
            .then(() => {
                console.log('Message sent successfully');
                this.showToast('Message sent successfully', 'Message sent successfully', 'success');
                // Clear ONLY after success
                this.newMessage = '';

                // Force UI sync (important)
                const textarea = this.template.querySelector('textarea');
                if (textarea) {
                    textarea.value = '';
                }
            })
            .catch(error => {
                console.error(error);

                // Optional UX improvement
                this.showToast('Error', 'Message failed', 'error');
            });
    }

    // handleChange(event) {
    //     this.newMessage = event.target.value;
    // }

    // handleKeyPress(event) {
    //     if (event.key === 'Enter') {
    //         this.handleSend();
    //     }
    // }

    handleInput(event) {
        this.newMessage = event.target.value;

        this.autoResizeTextarea(event.target);
    }

    autoResizeTextarea(textarea) {
        if (!textarea) return;

        textarea.style.height = 'auto'; // reset
        textarea.style.height = textarea.scrollHeight + 'px';
    }

    handleKeyDown(event) {

        // ENTER key
        if (event.key === 'Enter') {

            if (event.shiftKey) {
                // Shift + Enter → allow newline
                return;
            }

            // Prevent newline
            event.preventDefault();

            // Send message
            this.handleSend();
        }
    }

    // ================= PLATFORM EVENT =================
    subscribeToEvent() {

        subscribe(this.channelName, -1, (event) => {

            const payload = event.data.payload;

            if (!payload || !payload.Phone__c) return;

            // ============================================
            // Update contact list
            // ============================================
            const isCurrentChat =
                this.selectedContact &&
                this.selectedContact.Phone === payload.Phone__c;

            this.contacts = this.contacts.map(c => {

                if (c.Phone === payload.Phone__c) {

                    // const hasUnread =
                    //     payload.Direction__c === 'Inbound'
                    //     && !isCurrentChat;

                    const hasUnread =
                        payload.Direction__c === 'Inbound'
                        && !isCurrentChat;

                    // ============================================
                    // Realtime unread count
                    // ============================================

                    const unreadCount = hasUnread
                        ? (c.unreadCount || 0) + 1
                        : 0;

                    return {
                        ...c,

                        lastMessage:
                            payload.Message__c || c.lastMessage,

                        // lastMessageTime: 'Now',
                        lastMessageTime:
                            payload.Message_Created_Date__c
                                ? this.formatTime(
                                    payload.Message_Created_Date__c
                                )
                                : 'Now',

                        hasUnreadMessages: unreadCount > 0,

                        unreadCount: unreadCount,


                        // IMPORTANT
                        messageClass: hasUnread
                            ? 'contact-last-message unread'
                            : 'contact-last-message read',

                        timeClass: hasUnread
                            ? 'message-time unread'
                            : 'message-time read',

                        onlineClass: 'online-dot online'
                    };
                }

                return c;
            });

            // ============================================
            // Sync filtered list
            // ============================================

            this.filteredContacts =
                this.filteredContacts.map(c => {

                    if (c.Phone === payload.Phone__c) {

                        // const hasUnread =
                        //     payload.Direction__c === 'Inbound'
                        //     && !isCurrentChat;

                        const hasUnread =
                            payload.Direction__c === 'Inbound'
                            && !isCurrentChat;

                        // ============================================
                        // Realtime unread count
                        // ============================================

                        const unreadCount = hasUnread
                            ? (c.unreadCount || 0) + 1
                            : 0;

                        return {
                            ...c,

                            lastMessage:
                                payload.Message__c || c.lastMessage,

                            // lastMessageTime: 'Now',
                            lastMessageTime:
                                payload.Message_Created_Date__c
                                    ? this.formatTime(
                                        payload.Message_Created_Date__c
                                    )
                                    : 'Now',

                            hasUnreadMessages: unreadCount > 0,

                            unreadCount: unreadCount,

                            messageClass: hasUnread
                                ? 'contact-last-message unread'
                                : 'contact-last-message read',

                            timeClass: hasUnread
                                ? 'message-time unread'
                                : 'message-time read',

                            onlineClass: 'online-dot online'
                        };
                    }
                    console.log('###### filteredContacts', JSON.stringify(this.filteredContacts));

                    return c;
                });

            setTimeout(() => {

                this.contacts = this.contacts.map(c => {

                    if (c.Phone === payload.Phone__c) {

                        return {
                            ...c,
                            onlineClass: 'online-dot offline'
                        };
                    }

                    return c;
                });

                this.filteredContacts =
                    this.filteredContacts.map(c => {

                        if (c.Phone === payload.Phone__c) {

                            return {
                                ...c,
                                onlineClass: 'online-dot offline'
                            };
                        }

                        return c;
                    });

            }, 60000);

            // If event belongs to another chat, only update contact preview
            if (
                !this.selectedContact ||
                this.selectedContact.Phone !== payload.Phone__c
            ) {
                return;
            }

            // ============================================
            // Chat already open
            // mark latest inbound as read
            // ============================================

            if (payload.Direction__c === 'Inbound') {

                markChatAsRead({
                    contact_id: this.selectedContact.Id,
                    phone: this.selectedContact.Phone
                })
                    .catch(error => {
                        console.error(
                            'markChatAsRead error',
                            error
                        );
                    });

                // ============================================
                // Realtime last seen update
                // ============================================
                debugger;
                this.lastSeenLabel = 'Online';
                //this.isContactOnline = true;
                this.setContactOnline();

            }

            // ============================================
            // STEP 1 — Extract ONLY real messages
            // ============================================
            let onlyMessages = this.messages.filter(m => m.type === 'message');

            let updated = false;

            // ============================================
            // STEP 2 — Replace / Update messages
            // ============================================
            onlyMessages = onlyMessages.map(msg => {

                // ============================================
                // CASE 1 — TEMP message replacement
                // When we are sending message to single contact, we are creating a temporary message and showing on UI
                // and when we receive the message from WhatsApp, we are replacing the temporary message with the real message
                // so that we can show the real message on UI
                // ============================================
                if (
                    msg.Id &&
                    msg.Id.startsWith('temp_') &&
                    payload.Message__c &&
                    msg.Message_Text__c === payload.Message__c &&
                    msg.Direction__c === payload.Direction__c
                ) {

                    updated = true;

                    return this.formatMessage({
                        ...msg,

                        // Keep Salesforce UI Id
                        Id: msg.Id,

                        // Store REAL WhatsApp message id
                        Message_Id__c: payload.Message_Id__c,

                        Message_Delivery_Status__c:
                            payload.WhatsApp_Delivery_Status__c
                    });
                }

                // ============================================
                // CASE 2 — REAL message status update
                // When we are sending messages in bulk, we are loading the messages from database and showing on UI 
                // ============================================
                if (
                    msg.Message_Id__c &&
                    msg.Message_Id__c === payload.Message_Id__c
                ) {

                    updated = true;

                    return this.formatMessage({
                        ...msg,
                        Message_Delivery_Status__c:
                            payload.WhatsApp_Delivery_Status__c
                    });
                }

                return msg;
            });

            // ============================================
            // STEP 3 — Add inbound message
            // ============================================
            if (!updated && payload.Message__c && payload.Direction__c === 'Inbound') {

                onlyMessages = [
                    ...onlyMessages,
                    this.formatMessage({
                        Id: payload.Message_Id__c,
                        Message_Text__c: payload.Message__c,
                        Direction__c: payload.Direction__c,
                        CreatedDate: new Date()
                    })
                ];
            }

            // ============================================
            // STEP 4 — Rebuild with date separators
            // ============================================
            this.messages = this.prepareMessagesWithDate(onlyMessages);

            // ============================================
            // STEP 5 — Scroll to bottom
            // ============================================
            this.scrollToBottom();
        });
    }

    // ================= LAST SEEN =================
    loadLastSeen() {
        debugger;
        getLastSeen({ phone: this.selectedContact.Phone })
            .then(res => {
                this.lastSeenLabel = this.formatLastSeen(res);
            })
            .catch(error => {
                console.error('Error fetching last seen:', error);
            });
    }

    formatLastSeen(dateTime) {
        this.isContactOnline = false;

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
            //this.isContactOnline = true;
            this.setContactOnline();
            return 'Online';
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

    // ================= HELPERS =================
    getInitials(name) {
        return name ? name.split(' ').map(n => n[0]).join('').toUpperCase() : 'NA';
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

    getStatusClass(status) {
        return status === 'read' ? 'message-status message-status-read' : 'message-status';
    }

    formatTime(date) {
        return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    // ================= BULK =================
    openBulkMessageModal() {
        debugger;
        this.showModal = true;

        setTimeout(() => {
            const textarea = this.template.querySelector('.bulk-message-input');
            if (textarea) textarea.focus();
        }, 0);
    }

    closeModal() {
        this.showModal = false;
    }

    handleBulkMessageChange(event) {
        this.bulkMessage = event.target.value;
    }

    sendBulkMessage() {
        debugger;
        console.log('this.selectedContactsList', this.selectedContactsList);
        console.log('this.selectedContactsList', JSON.stringify(this.selectedContactsList));
        console.log('this.bulkMessage', this.bulkMessage);

        debugger;
        this.selectedContactsList.forEach(c => {
            debugger;
            sendMessage({
                phone: c.Phone,
                message: this.bulkMessage,
                contactId: c.Id
            })
                .then(response => {
                    console.log('response', response);
                    console.log('Message sent successfully');

                    // If current open chat is part of bulk, reload messages from backend
                    if (this.selectedContact?.Id === c.Id) {
                        this.loadMessages();
                    }
                });
        });

        this.bulkMessage = '';
        this.clearSelection();
        this.closeModal();
    }

    // sendBulkMessage() {

    //     const selectedIds = new Set(
    //         this.selectedContactsList.map(c => c.Id)
    //     );

    //     // ==============================
    //     // 1. SEND ALL MESSAGES (NO UI LOGIC HERE)
    //     // ==============================
    //     this.selectedContactsList.forEach(c => {
    //         sendMessage({
    //             phone: c.Phone,
    //             message: this.bulkMessage,
    //             contactId: c.Id
    //         });
    //     });

    //     // ==============================
    //     // 2. UPDATE CONTACT LIST (ONE TIME)
    //     // ==============================
    //     this.contacts = this.contacts.map(contact => {
    //         if (selectedIds.has(contact.Id)) {
    //             return {
    //                 ...contact,
    //                 lastMessage: this.bulkMessage,
    //                 lastMessageTime: 'Now'
    //             };
    //         }
    //         return contact;
    //     });

    //     this.filteredContacts = this.filteredContacts.map(contact => {
    //         if (selectedIds.has(contact.Id)) {
    //             return {
    //                 ...contact,
    //                 lastMessage: this.bulkMessage,
    //                 lastMessageTime: 'Now'
    //             };
    //         }
    //         return contact;
    //     });

    //     // ==============================
    //     // 3. UPDATE CURRENT CHAT (ONLY ONCE)
    //     // ==============================
    //     if (this.selectedContact && selectedIds.has(this.selectedContact.Id)) {

    //         const tempMsg = this.formatMessage({
    //             Id: 'temp_' + Date.now(),
    //             Message_Text__c: this.bulkMessage,
    //             Direction__c: 'Outbound',
    //             Message_Delivery_Status__c: 'sent',
    //             CreatedDate: new Date()
    //         });

    //         const onlyMessages = this.messages.filter(m => m.type === 'message');

    //         this.messages = this.prepareMessagesWithDate([
    //             ...onlyMessages,
    //             tempMsg
    //         ]);
    //     }

    //     // ==============================
    //     // 4. CLEANUP
    //     // ==============================
    //     this.bulkMessage = '';
    //     this.closeModal();
    // }


    get noContacts() {
        return !this.filteredContacts.length && !this.isLoading;
    }

    get isBulkDisabled() {
        return !this.bulkMessage;
    }

    // ================= GROUPS ================= 
    @track showCheckboxesForBulk = false;

    // handleGroupsClick() {
    //     debugger;
    //     console.log('handleGroupsClick');
    //     this.filteredContacts = this.filteredContacts.map(c => ({
    //         ...c,
    //         selected: false,
    //         cssClass: 'contact-item'
    //     }));

    //     this.showCheckboxesForBulk = !this.showCheckboxesForBulk;
    // }

    handleGroupsClick() {
        debugger;
        this.showCheckboxesForBulk = !this.showCheckboxesForBulk;

        // When enabling bulk mode → rebuild map
        if (this.showCheckboxesForBulk) {
            debugger;
            console.log('this.selectedContactsMap', this.selectedContactsMap);
            console.log('this.selectedContactsList', this.selectedContactsList.length);

            // Clear old selections if any
            this.selectedContactsMap.clear();

            this.contacts = this.contacts.map(c => ({
                ...c,
                selected: false
            }));

            this.filteredContacts = this.filteredContacts.map(c => ({
                ...c,
                selected: false
            }));

        } else {
            // Optional: clear all when exiting bulk mode
            this.clearSelection();
        }
    }

    // clearSelection() {

    //     this.selectedContactsMap.clear();
    //     this.showCheckboxesForBulk = false;

    //     const selectedId = this.selectedContact?.Id;

    //     // =========================
    //     // Update master list
    //     // =========================
    //     this.contacts = this.contacts.map(c => {

    //         return {
    //             ...c,
    //             selected: false,
    //             cssClass: isActive
    //                 ? 'contact-item selected'
    //                 : 'contact-item'
    //         };
    //     });

    //     // =========================
    //     // Update filtered list
    //     // =========================
    //     this.filteredContacts = this.filteredContacts.map(c => {

    //         return {
    //             ...c,
    //             selected: false,
    //             cssClass: isActive
    //                 ? 'contact-item selected'
    //                 : 'contact-item'
    //         };
    //     });

    //     // =========================
    //     // Re-add active contact to map (optional)
    //     // =========================
    //     // if (this.selectedContact) {
    //     //     this.selectedContactsMap.set(selectedId, this.selectedContact);
    //     // }
    // }

    // ================= TOAST =================
    clearSelection() {

        // =========================
        // Reset bulk state
        // =========================
        this.selectedContactsMap.clear();

        this.showCheckboxesForBulk = false;

        const selectedId = this.selectedContact?.Id;

        // =========================
        // Update master list
        // =========================
        this.contacts = this.contacts.map(c => ({

            ...c,

            // ❌ DO NOT keep checkbox selected
            selected: false,

            // ✅ Keep active chat highlighted
            cssClass: c.Id === selectedId
                ? 'contact-item selected'
                : 'contact-item'
        }));

        // =========================
        // Update filtered list
        // =========================
        this.filteredContacts = this.filteredContacts.map(c => ({

            ...c,

            // ❌ DO NOT keep checkbox selected
            selected: false,

            // ✅ Keep active chat highlighted
            cssClass: c.Id === selectedId
                ? 'contact-item selected'
                : 'contact-item'
        }));
    }

    showToast(title, message, variant) {
        debugger;
        this.dispatchEvent(
            new ShowToastEvent({
                title,
                message,
                variant
            })
        );
    }

    scrollToBottom() {
        setTimeout(() => {
            const container = this.template.querySelector('.chat-body');
            if (container) {
                container.scrollTop = container.scrollHeight;
            }
        }, 100);
    }

    getDateLabel(dateStr) {

        const msgDate = new Date(dateStr);
        const today = new Date();

        const todayStart = new Date(today.setHours(0, 0, 0, 0));
        const msgStart = new Date(new Date(msgDate).setHours(0, 0, 0, 0));

        const diffDays = (todayStart - msgStart) / (1000 * 60 * 60 * 24);

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';

        return msgDate.toLocaleDateString();
    }

    prepareMessagesWithDate(messages) {

        let result = [];
        let lastDate = null;

        messages.forEach(msg => {

            const msgDate = new Date(msg.CreatedDate).toDateString();

            // Insert date separator if new date
            if (lastDate !== msgDate) {

                result.push({
                    Id: 'date_' + msgDate,
                    type: 'date',
                    label: this.getDateLabel(msg.CreatedDate),
                    isDate: true,
                    isMessage: false
                });

                lastDate = msgDate;
            }

            result.push({
                ...msg,
                type: 'message',
                isDate: false,
                isMessage: true
            });
        });

        return result;

        // Example output:
        // [
        //     { type: 'date', label: 'Yesterday' },

        //     { type: 'message', msg1 },
        //     { type: 'message', msg2 },

        //     { type: 'date', label: 'Today' },

        //     { type: 'message', msg3 },
        //     { type: 'message', msg4 }
        //   ]
    }

    handleKeyDown(event) {
        if (event.key === 'Escape') {
            this.closeModal();
        }
    }

    stopPropagation(event) {
        event.stopPropagation();
    }

    @track isDarkMode = false;

    get containerClass() {
        return `whatsapp-container ${this.isDarkMode ? 'theme-dark' : 'theme-light'}`;
    }

    get themeIcon() {
        return this.isDarkMode ? 'utility:brightness_high' : 'utility:brightness_low';
    }

    get hasMessages() {
        return Array.isArray(this.messages) && this.messages.length > 0;
    }

    get hasSelectedCount() {
        return (this.selectedCount || 0) > 0;
    }

    get bulkTargetLabel() {
        return this.selectedCount === 1 ? 'Contact' : 'Contacts';
    }

    // get selectedContactStatusClass() {
    //     if (!this.selectedContact) {
    //         return 'online-dot-sm offline';
    //     }
    //     return this.selectedContact.isOnline ? 'online-dot-sm online' : 'online-dot-sm offline';
    // }

    get selectedContactStatusClass() {

        if (!this.selectedContact) {
            return 'online-dot-sm offline';
        }

        return this.isContactOnline
            ? 'online-dot-sm online'
            : 'online-dot-sm offline';
    }

    get showProfileStatusClass() {
        return this.isContactOnline
            ? 'profile-online'
            : 'profile-offline';
    }

    get profileOnlineClass() {

        return this.isContactOnline
            ? 'profile-online online'
            : 'profile-online offline';
    }

    get noContacts() {
        return !this.filteredContacts || this.filteredContacts.length === 0;
    }

    toggleTheme() {
        this.isDarkMode = !this.isDarkMode;

        try {
            window.localStorage.setItem('wa-theme', this.isDarkMode ? 'dark' : 'light');
        } catch (e) {
            // Ignore
        }
    }
    get chatStatusClass() {

        return this.isContactOnline
            ? 'chat-contact-status online'
            : 'chat-contact-status';
    }

    setContactOnline() {

        // Make online immediately
        this.isContactOnline = true;

        // Clear previous timer
        if (this.onlineTimeout) {
            clearTimeout(this.onlineTimeout);
        }

        // Auto offline after 1 minute
        this.onlineTimeout = setTimeout(() => {

            this.isContactOnline = false;

            // Refresh label again
            this.loadLastSeen();

        }, 60000); // 60 sec
    }

    setContactOnline() {

        // Make online immediately
        this.isContactOnline = true;

        // Clear previous timer
        if (this.onlineTimeout) {
            clearTimeout(this.onlineTimeout);
        }

        // Auto offline after 1 minute
        this.onlineTimeout = setTimeout(() => {

            this.isContactOnline = false;

            // Refresh label again
            this.loadLastSeen();

        }, 60000); // 60 sec
    }

    disconnectedCallback() {

        if (this.onlineTimeout) {
            clearTimeout(this.onlineTimeout);
        }
    }
}

