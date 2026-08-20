/**
 * Action Buyer UK - Marketplace Integration Layer
 *
 * Tracks where acquired stock is published and how each sales channel performs.
 */

const SALES_CHANNELS = Object.freeze([
  'Website',
  'eBay',
  'Facebook Marketplace',
  'Other'
]);

function createChannelListing({ assetId, channel, listingReference = null }) {
  if (!assetId) throw new Error('assetId is required');
  if (!channel) throw new Error('channel is required');

  return {
    assetId,
    channel,
    listingReference,
    status: 'Draft',
    createdAt: new Date().toISOString()
  };
}

function updateListingChannelStatus(listing, status) {
  return {
    ...listing,
    status,
    updatedAt: new Date().toISOString()
  };
}

function createChannelPerformanceReport(listings = [], sales = []) {
  return SALES_CHANNELS.map((channel) => {
    const channelListings = listings.filter((item) => item.channel === channel);
    const channelSales = sales.filter((sale) => sale.salesChannel === channel);

    return {
      channel,
      listings: channelListings.length,
      sales: channelSales.length,
      revenue: channelSales.reduce(
        (sum, sale) => sum + (Number(sale.salePrice) || 0),
        0
      )
    };
  });
}

module.exports = {
  SALES_CHANNELS,
  createChannelListing,
  updateListingChannelStatus,
  createChannelPerformanceReport
};
