/**
 * Action Buyer UK - Resale Channel Sync Layer
 *
 * Internal channel state management. External marketplaces are not called
 * directly here; adapters can use these records when integrations are added.
 */

const CHANNELS = Object.freeze(['Website', 'eBay', 'Facebook Marketplace', 'Other']);
const LISTING_STATUSES = Object.freeze(['Draft', 'Ready', 'Published', 'Reserved', 'Sold', 'Removed']);

function createChannelListing({
  assetId,
  channel,
  listingReference = null,
  listingUrl = null,
  askingPrice = 0,
  status = 'Draft',
  listedAt = null
}) {
  if (!assetId) throw new Error('assetId is required');
  if (!CHANNELS.includes(channel)) throw new Error('Invalid sales channel');
  if (!LISTING_STATUSES.includes(status)) throw new Error('Invalid listing status');

  return {
    assetId,
    channel,
    listingReference,
    listingUrl,
    askingPrice: Number(askingPrice) || 0,
    status,
    listedAt,
    updatedAt: new Date().toISOString()
  };
}

function updateChannelListing(listing, updates = {}) {
  if (!listing) throw new Error('listing is required');
  if (updates.status && !LISTING_STATUSES.includes(updates.status)) {
    throw new Error('Invalid listing status');
  }

  return {
    ...listing,
    ...updates,
    askingPrice: updates.askingPrice === undefined ? listing.askingPrice : Number(updates.askingPrice) || 0,
    updatedAt: new Date().toISOString()
  };
}

function canPublishAsset(asset) {
  const checks = {
    serialRecorded: Boolean(asset?.serial_number),
    conditionRecorded: Boolean(asset?.condition_grade),
    testingComplete: asset?.testing_status === 'Completed',
    photosReady: Number(asset?.photo_count || 0) > 0,
    priceApproved: Number(asset?.approved_resale_price || 0) > 0
  };

  return {
    ...checks,
    ready: Object.values(checks).every(Boolean)
  };
}

function summariseChannelListings(listings = []) {
  return CHANNELS.reduce((summary, channel) => {
    const channelListings = listings.filter((listing) => listing.channel === channel);
    summary[channel] = {
      listings: channelListings.length,
      published: channelListings.filter((listing) => listing.status === 'Published').length,
      reserved: channelListings.filter((listing) => listing.status === 'Reserved').length,
      sold: channelListings.filter((listing) => listing.status === 'Sold').length
    };
    return summary;
  }, {});
}

module.exports = {
  CHANNELS,
  LISTING_STATUSES,
  createChannelListing,
  updateChannelListing,
  canPublishAsset,
  summariseChannelListings
};
