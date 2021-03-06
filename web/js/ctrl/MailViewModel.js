"use strict";

tutao.provide('tutao.tutanota.ctrl.MailViewModel');

/**
 * The mails in the conversation on the right.
 * @constructor
 */
tutao.tutanota.ctrl.MailViewModel = function() {
	tutao.util.FunctionUtils.bindPrototypeMethodsToThis(this);

	this.conversation = ko.observableArray();
	this.showSpinner = ko.observable(false);
	this.conversationLoaded = ko.computed(function() {
		for (var i = 0; i < this.conversation().length; i++) {
			if (!this.conversation()[i].mailBodyLoaded()) {
				return false;
			}
		}
		return (this.conversation().length > 0);
	}, this);
	this.oldState = null;
	this.conversationLoaded.subscribe(function(loaded) {
		if (this.oldState && this.oldState == loaded) {
			return;
		} else {
			this.oldState = loaded;
		}
		if (loaded) {
			this.showSpinner(false);
			tutao.locator.mailView.fadeConversationIn(function() {});
		} else {
			tutao.locator.mailView.hideConversation();
		}
	}, this);
};

/**
 * Shows the given mail in its conversation.
 * @param {tutao.entity.tutanota.Mail} mail The mail to show.
 */
tutao.tutanota.ctrl.MailViewModel.prototype.showMail = function(mail) {
	var self = this;
	var mails = [];
	this._setConversation([mail]);
    mail.loadConversationEntry();
    /* We currently don't display the whole conversation but will do this later
	// we just load the conversation because we need it later (to get it synchronous)
	tutao.entity.tutanota.ConversationEntry.loadRange(mail.getConversationEntry()[0], tutao.rest.EntityRestInterface.GENERATED_MIN_ID, tutao.rest.EntityRestInterface.MAX_RANGE_COUNT, false, function(conversationEntries, exception) {
		if (exception) {
			console.log("conversation could not be loaded");
		}
	});
	tutao.entity.tutanota.ConversationEntry.loadRange(mail.getConversationEntry()[0], tutao.rest.EntityRestInterface.GENERATED_MIN_ID, tutao.rest.EntityRestInterface.MAX_RANGE_COUNT, false, function(conversationEntries, exception) {
		if (exception) {
			console.log("conversation could not be loaded");
			self._setConversation([mail]);
		} else {
			mail.loadConversationEntry(function(ce, exception) {
				if (!exception) {
					self._loadNextMails(ce, mails, function() {
						self._setConversation(mails);
					});
				} else {
					console.log(exception);
				}
			});
		}
	});*/
};

/**
 * Loads the mail of the given conversation entry (if existing) and puts it into mails. Then triggers loading the
 * previous mail.
 * @param {tutao.entity.tutanota.ConversationEntry} conversationEntry The conversation entry to start loading from.
 * @param {Array.<tutao.entity.tutanota.Mail>} mails The result list with all loaded mails.
 * @return {Promise.<>} Resolves when all mails have been loaded.
 */
tutao.tutanota.ctrl.MailViewModel.prototype._loadNextMails = function(conversationEntry, mails) {
	var self = this;
	// there might be no mail for this user, so skip it in that case
	if (conversationEntry.getMail()) {
		return conversationEntry.loadMail().then(function(mail) {
    		mails.push(mail);
			return self._loadNextMailsLoadPrevious(conversationEntry, mails);
		}).caught(function(exception) {
            console.log(exception);
        });
	} else {
		return self._loadNextMailsLoadPrevious(conversationEntry, mails);
	}
};

/**
 * Loads the previous conversation entry of the given conversation entry. Then triggers loading the
 * the mail from that conversation entry.
 * @param {tutao.entity.tutanota.ConversationEntry} conversationEntry The conversation entry to load the previous from.
 * @param {Array.<tutao.entity.tutanota.Mail>} mails The result list with all loaded mails.
 * @return {Promise.<>} Resolves when all mails have been loaded.
 */
tutao.tutanota.ctrl.MailViewModel.prototype._loadNextMailsLoadPrevious = function(conversationEntry, mails) {
	var self = this;
	if (conversationEntry.getPrevious()) {
		return conversationEntry.loadPrevious().then(function(nextCe, exception) {
			return self._loadNextMails(nextCe, mails);
		}).caught(function(exception) {
            console.log(exception);
        });
	} else {
		return Promise.resolve();
	}
};

/**
 * Hides any visible conversation.
 */
tutao.tutanota.ctrl.MailViewModel.prototype.hideConversation = function() {
	this.conversation.removeAll();
};

/**
 * Removes the first mail from the conversation.
 */
tutao.tutanota.ctrl.MailViewModel.prototype.removeFirstMailFromConversation = function() {
	this.conversation.shift();
};

/**
 * Adds a mail to the conversation as first mail.
 * @param {tutao.tutanota.ctrl.DisplayedMail|tutao.tutanota.ctrl.ComposingMail} mail The mail to insert.
 */
tutao.tutanota.ctrl.MailViewModel.prototype.addFirstMailToConversation = function(mail) {
	this.conversation.unshift(mail);
};

/**
 * Shows the conversation in the mail view. Loads the mail body text asynchronously.
 * @param {Array.<tutao.tutanot.entity.Mail>} conversation The list of mails to show.
 */
tutao.tutanota.ctrl.MailViewModel.prototype._setConversation = function(conversation) {
	var self = this;
	self.conversation.removeAll();

    // only show the spinner after 200ms if the conversation has not been loaded till then
    setTimeout(function() {
        if (!self.conversationLoaded()) {
            self.showSpinner(true);
        }
    }, 200);

    return Promise.map(conversation, function(mail) {
        self.conversation.push(new tutao.tutanota.ctrl.DisplayedMail(mail));
        return new Promise(function(resolve, reject) {
            setTimeout(resolve, 0); // pause after decrypting each mail for rotating the spinner (won't do this otherwise).
        });
    });
};

/**
 * Provides a ContactWrapper for the given mail address or null if none was found.
 * @param {string} mailAddress The mail address.
 * @return {tutao.entity.tutanota.ContactWrapper} The contact wrapper.
 */
tutao.tutanota.ctrl.MailViewModel.prototype._findContactByMailAddress = function(mailAddress) {
	var contactWrappers = tutao.tutanota.ctrl.ComposingMail._getContacts();
	for (var i = 0; i < contactWrappers.length; i++) {
		if (contactWrappers[i].hasMailAddress(mailAddress)) {
			return contactWrappers[i];
		}
	}
	return null;
};

/**
 * @param {tutao.tutanota.ctrl.RecipientInfo=} recipientInfo Optional recipient info as recipient.
 * @return {Promise.<boolean>}
 */
tutao.tutanota.ctrl.MailViewModel.prototype.newMail = function(recipientInfo) {
	var recipients = (recipientInfo) ? [recipientInfo] : [];
	return this._createMail(tutao.entity.tutanota.TutanotaConstants.CONVERSATION_TYPE_NEW, "", recipients, [], null);
};

/**
 * Lets the user write a reply mail to the given displayed mail.
 * @param {tutao.tutanota.ctrl.DisplayedMail} displayedMail The mail we want to reply to.
 */
tutao.tutanota.ctrl.MailViewModel.prototype.replyMail = function(displayedMail) {
	var infoLine = tutao.tutanota.util.Formatter.formatFullDateTime(displayedMail.mail.getSentDate()) + " " + tutao.lang("by_label") + " " + displayedMail.mail.getSender().getAddress() + ":";
	var body = "<br><br>" + infoLine + "<br><br><blockquote class=\"tutanota_quote\">" + displayedMail.bodyText() + "</blockquote>";
	var recipient;
	if (tutao.locator.userController.isExternalUserLoggedIn()) {
		// TODO (story: delete user) check that the recipient is actually internal (i.e. not unregistered)
		recipient = new tutao.tutanota.ctrl.RecipientInfo(displayedMail.mail.getSender().getAddress(), displayedMail.mail.getSender().getName(), this._findContactByMailAddress(displayedMail.mail.getSender().getAddress()), false);
	} else {
		recipient = new tutao.tutanota.ctrl.RecipientInfo(displayedMail.mail.getSender().getAddress(), displayedMail.mail.getSender().getName(), this._findContactByMailAddress(displayedMail.mail.getSender().getAddress()));
	}
    recipient.resolveType().caught(tutao.ConnectionError, function(e) {
        // we are offline but we want to show the dialog only when we click on send.
    });
	this._createMail(tutao.entity.tutanota.TutanotaConstants.CONVERSATION_TYPE_REPLY, tutao.entity.tutanota.TutanotaConstants.CONVERSATION_REPLY_SUBJECT_PREFIX + displayedMail.mail.getSubject(), [recipient], [], displayedMail, body);
};

/**
 * Lets the user write a reply mail to the sender and all of the recipients of the given displayed mail.
 * @param {tutao.tutanota.ctrl.DisplayedMail} displayedMail The mail we want to reply to.
 */
tutao.tutanota.ctrl.MailViewModel.prototype.replyAllMail = function(displayedMail) {
	var infoLine = tutao.tutanota.util.Formatter.formatFullDateTime(displayedMail.mail.getSentDate()) + " " + tutao.lang("by_label") + " " + displayedMail.mail.getSender().getAddress() + ":";
	var body = "<br><br>" + infoLine + "<br><br><blockquote class=\"tutanota_quote\">" + displayedMail.bodyText() + "</blockquote>";
	var toRecipients = [new tutao.tutanota.ctrl.RecipientInfo(displayedMail.mail.getSender().getAddress(), displayedMail.mail.getSender().getName(), this._findContactByMailAddress(displayedMail.mail.getSender().getAddress()))];
	var ccRecipients = [];
	var oldRecipients = displayedMail.mail.getToRecipients().concat(displayedMail.mail.getCcRecipients());
	for (var i = 0; i < oldRecipients.length; i++) {
		if (oldRecipients[i].getAddress() != tutao.locator.userController.getMailAddress()) {
			ccRecipients.push(new tutao.tutanota.ctrl.RecipientInfo(oldRecipients[i].getAddress(), oldRecipients[i].getName(), this._findContactByMailAddress(oldRecipients[i].getAddress())));
		}
	}
    var allRecipients = toRecipients.concat(ccRecipients);
    Promise.each(allRecipients, function(/*tutao.tutanota.ctrl.RecipientInfo*/recipient) {
        recipient.resolveType();
    }).caught(tutao.ConnectionError, function(e) {
        // we are offline but we want to show the dialog only when we click on send.
    });
	this._createMail(tutao.entity.tutanota.TutanotaConstants.CONVERSATION_TYPE_REPLY, tutao.entity.tutanota.TutanotaConstants.CONVERSATION_REPLY_SUBJECT_PREFIX + displayedMail.mail.getSubject(), toRecipients, ccRecipients, displayedMail, body);
};

/**
 * Lets the user write a mail forwarding the given displayed mail.
 * @param {tutao.tutanota.ctrl.DisplayedMail} displayedMail The mail we want to forward.
 */
tutao.tutanota.ctrl.MailViewModel.prototype.forwardMail = function(displayedMail) {
	var infoLine = tutao.lang("date_label") + ": " + tutao.tutanota.util.Formatter.formatFullDateTime(displayedMail.mail.getSentDate()) + "<br>";
	infoLine += tutao.lang("from_label") + ": " + displayedMail.mail.getSender().getAddress() + "<br>";
	if (displayedMail.mail.getToRecipients().length > 0) {
		infoLine += tutao.lang("to_label") + ": " + displayedMail.mail.getToRecipients()[0].getAddress();
		for (var i = 1; i < displayedMail.mail.getToRecipients().length; i++) {
			infoLine += ", " + displayedMail.mail.getToRecipients()[i].getAddress();
		}
		infoLine += "<br>";
	}
	if (displayedMail.mail.getCcRecipients().length > 0) {
		infoLine += tutao.lang("cc_label") + ": " + displayedMail.mail.getCcRecipients()[0].getAddress();
		for (var i = 1; i < displayedMail.mail.getCcRecipients().length; i++) {
			infoLine += ", " + displayedMail.mail.getCcRecipients()[i].getAddress();
		}
		infoLine += "<br>";
	}
	infoLine += tutao.lang("subject_label") + ": " + displayedMail.mail.getSubject();
	var body = "<br><br>" + infoLine + "<br><br><blockquote class=\"tutanota_quote\">" + displayedMail.bodyText() + "</blockquote>";
    var self = this;
	this._createMail(tutao.entity.tutanota.TutanotaConstants.CONVERSATION_TYPE_FORWARD, tutao.entity.tutanota.TutanotaConstants.CONVERSATION_FORWARD_SUBJECT_PREFIX + displayedMail.mail.getSubject(), [], [], displayedMail, body).then(function() {
        self.getComposingMail()._attachments(displayedMail.attachments());
    });
};

/**
 * Opens an export dialog that shows how the mail can be exported to Outlook, Thunderbird and the Filesystem.
 * @param {tutao.tutanota.ctrl.DisplayedMail} displayedMail The mail we want to export.
 */
tutao.tutanota.ctrl.MailViewModel.prototype.exportMail = function(displayedMail) {
    return tutao.tutanota.util.Exporter.toEml(displayedMail).then(function(eml) {
        var buffer = tutao.util.EncodingConverter.asciiToArrayBuffer(eml);
        var tmpFile = new tutao.entity.tutanota.File();
        var filename = displayedMail.mail.getSubject();
        if (filename.trim().length == 0) {
            filename = "unnamed";
        }
        tmpFile.setName(filename + ".eml");
        tmpFile.setMimeType("message/rfc822");
        tmpFile.setSize(String(buffer.byteLength));
        tutao.tutanota.util.FileUtils.provideDownload(new tutao.tutanota.util.DataFile(buffer, tmpFile));
    });
};

/**
 * Lets the user write a mail.
 * @param {string} conversationType The conversation type (REPLY or FORWARD). See TutanotaConstants.
 * @param {string} subject The subject for the mail.
 * @param {Array.<tutao.tutanota.ctrl.RecipientInfo>} toRecipients The recipient infos that shall appear as to recipients in the mail.
 * @param {Array.<tutao.tutanota.ctrl.RecipientInfo>} ccRecipients The recipient infos that shall appear as cc recipients in the mail.
 * @param {tutao.tutanota.ctrl.DisplayedMail=} previousMail The previous mail to be visible below the new mail. Null if no previous mail shall be visible.
 * @param {string} bodyText The text to insert into the mail body.
 * @return {Promise<boolean>} resolves to true, if the new mail has been created, to false otherwise
 */
tutao.tutanota.ctrl.MailViewModel.prototype._createMail = function(conversationType, subject, toRecipients, ccRecipients, previousMail, bodyText) {
	var self = this;

	if (!self.tryCancelAllComposingMails()) {
		return false;
	}

	// any selected mails in the mail list shall be deselected
	tutao.locator.mailListViewModel.unselectAll();

    var mailCreatedPromise;
	if (previousMail) {
		for (var i = 0; i < this.conversation().length; i++) {
			if (this.conversation()[i] == previousMail) {
				this.conversation.splice(0, i); // remove all mails up to the selected
				break;
			}
		}

        var previousMessageId = null;
		mailCreatedPromise = previousMail.mail.loadConversationEntry().then(function(ce) {
            previousMessageId = ce.getMessageId();
        }).caught(function(e) {
            console.log("could not load conversation entry", e);
        }).then(function() {
            // the conversation key may be null if the mail was e.g. received from an external via smtp
            var mail = new tutao.tutanota.ctrl.ComposingMail(conversationType, previousMessageId);
            self.conversation([mail]);
            mail.setBody(bodyText);
        });
	} else {
        mailCreatedPromise = Promise.resolve();
		this.conversation([new tutao.tutanota.ctrl.ComposingMail(conversationType, null)]);
	}

    return mailCreatedPromise.then(function() {
        self.getComposingMail().composerSubject(subject);
        for (var i = 0; i < toRecipients.length; i++) {
            self.getComposingMail().addToRecipient(toRecipients[i]);
        }
        for (var i = 0; i < ccRecipients.length; i++) {
            self.getComposingMail().addCcRecipient(ccRecipients[i]);
        }

        //	not needed currently as we scroll the complete window when editing a mail
        tutao.locator.mailView.showConversationColumn();


        // uncomment for test sending html emails (also switch to composeBodyTextArea in index.html)
        //self.editor = new Quill('div.composeBody', {theme: 'snow'});
        //self.editor.addModule('toolbar', {
        //    container: '#toolbar-toolbar'     // Selector for toolbar container
        //});
        ////TODO (story send html email): test on mobiles and move to view
        //	this.editor = new wysihtml5.Editor("composeBodyTextArea", { // id of textarea element
        //		toolbar:      null, // id of toolbar element
        //		parserRules:  wysihtml5ParserRules // defined in parser rules set
        //	});
        //	var onChange = function() {
        //		self.conversation()[0].composerBody($("#composeBodyTextArea").val());
        //	};
        //	this.editor.on("change", onChange);

        return true;
    });

};

/**
 * Finally deletes this mail.
 * @param {tutao.tutanota.ctrl.DisplayedMail} displayedMail The mail we want to delete finally.
 * @return {window.Promise} The promise.
 */
tutao.tutanota.ctrl.MailViewModel.prototype.finalDeleteMail = function(displayedMail) {
    return tutao.locator.mailListViewModel.finallyDeleteMails([displayedMail.mail.getId()]);
};

/**
 * Deletes or undeletes the given displayed mail.
 * @param {tutao.tutanota.ctrl.DisplayedMail} displayedMail The mail we want to delete/undelete.
 */
tutao.tutanota.ctrl.MailViewModel.prototype.deleteMail = function(displayedMail) {
	tutao.locator.mailListViewModel.trashMail([displayedMail.mail], !displayedMail.mail.getTrashed());
};

/**
 * If a composing mail is open, asks the user to cancel that mail.
 * @return {boolean} True if no composing mail is open any more, false otherwise.
 */
tutao.tutanota.ctrl.MailViewModel.prototype.tryCancelAllComposingMails = function() {
	if (this.conversation().length == 0) {
		return true;
	} else if (this.isComposingState()) {
		return (this.getComposingMail().cancelMail(true));
	} else {
		return true;
	}
};

/**
 * Provides the information if a composing mail is open.
 * @return {Boolean} True, if we are composing an E-Mail right now.
 */
tutao.tutanota.ctrl.MailViewModel.prototype.isComposingState = function() {
	return (this.conversation().length > 0 && this.conversation()[0] instanceof tutao.tutanota.ctrl.ComposingMail);
};

/**
 * Provides the composing mail, if existing in the conversation.
 * @return {tutao.tutanota.ComposingMail} The composing mail.
 */
tutao.tutanota.ctrl.MailViewModel.prototype.getComposingMail = function() {
	if (!this.isComposingState()) {
		throw new Error("RuntimeException: not in composing state");
	}
	return this.conversation()[0];
};

/**
 * Provides the information if a composing mail is open and secure external recipients have been selected.
 * @return {Boolean} True if secure external recipients have been selected, false otherwise.
 */
tutao.tutanota.ctrl.MailViewModel.prototype.isComposingMailToSecureExternals = function() {
	return (this.isComposingState() && this.getComposingMail().composeForSecureExternalRecipients());
};

/**
 * Returns true if no conversation (i.e. no mail) is shown.
 * @return {Boolean} True if no conversation is shown, false otherwise.
 */
tutao.tutanota.ctrl.MailViewModel.prototype.isConversationEmpty = function() {
	return (this.conversation().length == 0);
};

/**
 * @param {tutao.entity.tutanota.MailAddress} the MailAddress
 * @param {string} meId The id of the text that should be used if the mailAddress is the current user
 * @returns {string} The label for this MailAddress
 */
tutao.tutanota.ctrl.MailViewModel.prototype.getLabel = function(mailAddress, meId) {
    if (mailAddress.getAddress() == tutao.locator.userController.getMailAddress()) {
        return tutao.locator.languageViewModel.get(meId);
    } else if (mailAddress.getName() == "") {
        return mailAddress.getAddress();
    } else {
        return mailAddress.getName();
    }
};
