"use strict";

tutao.provide('tutao.entity.tutanota.PasswordChannelReturn');

/**
 * @constructor
 * @param {Object=} data The json data to store in this entity.
 */
tutao.entity.tutanota.PasswordChannelReturn = function(data) {
  if (data) {
    this.__format = data._format;
    this._phoneNumberChannels = [];
    for (var i=0; i < data.phoneNumberChannels.length; i++) {
      this._phoneNumberChannels.push(new tutao.entity.tutanota.PasswordChannelPhoneNumber(this, data.phoneNumberChannels[i]));
    }
  } else {
    this.__format = "0";
    this._phoneNumberChannels = [];
  }
  this._entityHelper = new tutao.entity.EntityHelper(this);
  this.prototype = tutao.entity.tutanota.PasswordChannelReturn.prototype;
};

/**
 * The version of the model this type belongs to.
 * @const
 */
tutao.entity.tutanota.PasswordChannelReturn.MODEL_VERSION = '5';

/**
 * The url path to the resource.
 * @const
 */
tutao.entity.tutanota.PasswordChannelReturn.PATH = '/rest/tutanota/passwordchannelresource';

/**
 * The encrypted flag.
 * @const
 */
tutao.entity.tutanota.PasswordChannelReturn.prototype.ENCRYPTED = false;

/**
 * Provides the data of this instances as an object that can be converted to json.
 * @return {Object} The json object.
 */
tutao.entity.tutanota.PasswordChannelReturn.prototype.toJsonData = function() {
  return {
    _format: this.__format, 
    phoneNumberChannels: tutao.entity.EntityHelper.aggregatesToJsonData(this._phoneNumberChannels)
  };
};

/**
 * The id of the PasswordChannelReturn type.
 */
tutao.entity.tutanota.PasswordChannelReturn.prototype.TYPE_ID = 327;

/**
 * The id of the phoneNumberChannels attribute.
 */
tutao.entity.tutanota.PasswordChannelReturn.prototype.PHONENUMBERCHANNELS_ATTRIBUTE_ID = 329;

/**
 * Sets the format of this PasswordChannelReturn.
 * @param {string} format The format of this PasswordChannelReturn.
 */
tutao.entity.tutanota.PasswordChannelReturn.prototype.setFormat = function(format) {
  this.__format = format;
  return this;
};

/**
 * Provides the format of this PasswordChannelReturn.
 * @return {string} The format of this PasswordChannelReturn.
 */
tutao.entity.tutanota.PasswordChannelReturn.prototype.getFormat = function() {
  return this.__format;
};

/**
 * Provides the phoneNumberChannels of this PasswordChannelReturn.
 * @return {Array.<tutao.entity.tutanota.PasswordChannelPhoneNumber>} The phoneNumberChannels of this PasswordChannelReturn.
 */
tutao.entity.tutanota.PasswordChannelReturn.prototype.getPhoneNumberChannels = function() {
  return this._phoneNumberChannels;
};

/**
 * Loads from the service.
 * @param {Object.<string, string>} parameters The parameters to send to the service.
 * @param {?Object.<string, string>} headers The headers to send to the service. If null, the default authentication data is used.
 * @return {Promise.<tutao.entity.tutanota.PasswordChannelReturn>} Resolves to PasswordChannelReturn or an exception if the loading failed.
 */
tutao.entity.tutanota.PasswordChannelReturn.load = function(parameters, headers) {
  if (!headers) {
    headers = tutao.entity.EntityHelper.createAuthHeaders();
  }
  parameters["v"] = 5;
  return tutao.locator.entityRestClient.getElement(tutao.entity.tutanota.PasswordChannelReturn, tutao.entity.tutanota.PasswordChannelReturn.PATH, null, null, parameters, headers);
};
