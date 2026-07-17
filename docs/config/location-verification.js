(function initLocationVerification(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.LocationVerification = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createLocationVerification() {
  function resolveVerificationFields({ existingProfile, draftLatLng, locationChanged, savedAt }) {
    const hasDraft = Boolean(draftLatLng);
    if (locationChanged) {
      return {
        locationVerified: hasDraft,
        locationVerifiedAt: hasDraft ? savedAt : "",
      };
    }

    const remainsVerified = hasDraft && existingProfile?.locationVerified === true;
    return {
      locationVerified: remainsVerified,
      locationVerifiedAt: remainsVerified ? existingProfile?.locationVerifiedAt || "" : "",
    };
  }

  return { resolveVerificationFields };
});
