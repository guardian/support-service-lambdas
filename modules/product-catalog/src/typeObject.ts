export const typeObject = {
  "DigitalSubscription": {
    "currencies": [
      "USD",
      "NZD",
      "EUR",
      "GBP",
      "CAD",
      "AUD"
    ],
    "productRatePlans": {
      "Monthly": {
        "Subscription": {}
      },
      "Annual": {
        "Subscription": {}
      },
      "ThreeMonthGift": {
        "Subscription": {}
      },
      "OneYearGift": {
        "Subscription": {}
      }
    }
  },
  "NationalDelivery": {
    "currencies": [
      "GBP"
    ],
    "productRatePlans": {
      "Sixday": {
        "Saturday": {},
        "Friday": {},
        "Thursday": {},
        "Wednesday": {},
        "Tuesday": {},
        "Monday": {}
      },
      "Weekend": {
        "Sunday": {},
        "Saturday": {}
      },
      "Everyday": {
        "Sunday": {},
        "Saturday": {},
        "Friday": {},
        "Thursday": {},
        "Wednesday": {},
        "Tuesday": {},
        "Monday": {}
      }
    }
  },
  "SupporterPlus": {
    "currencies": [
      "USD",
      "NZD",
      "EUR",
      "GBP",
      "CAD",
      "AUD"
    ],
    "productRatePlans": {
      "Monthly": {
        "Contribution": {},
        "Subscription": {}
      },
      "Annual": {
        "Subscription": {},
        "Contribution": {}
      },
      "SupporterPlusAndGuardianWeeklyDomesticMonthly": {
        "SupporterPlus": {},
        "GuardianWeekly": {}
      },
      "SupporterPlusAndGuardianWeeklyDomesticAnnual": {
        "SupporterPlus": {},
        "GuardianWeekly": {}
      },
      "SupporterPlusAndGuardianWeeklyRowAnnual": {
        "SupporterPlus": {},
        "GuardianWeekly": {}
      },
      "SupporterPlusAndGuardianWeeklyRowMonthly": {
        "SupporterPlus": {},
        "GuardianWeekly": {}
      }
    }
  },
  "GuardianWeeklyRestOfWorld": {
    "currencies": [
      "USD",
      "GBP"
    ],
    "productRatePlans": {
      "Monthly": {
        "Monthly": {}
      },
      "OneYearGift": {
        "Subscription": {}
      },
      "Annual": {
        "Subscription": {}
      },
      "SixWeekly": {
        "Subscription": {}
      },
      "Quarterly": {
        "Subscription": {}
      },
      "ThreeMonthGift": {
        "Subscription": {}
      }
    }
  },
  "GuardianWeeklyDomestic": {
    "currencies": [
      "USD",
      "NZD",
      "EUR",
      "GBP",
      "CAD",
      "AUD"
    ],
    "productRatePlans": {
      "OneYearGift": {
        "Subscription": {}
      },
      "Annual": {
        "Subscription": {}
      },
      "Quarterly": {
        "Subscription": {}
      },
      "Monthly": {
        "Subscription": {}
      },
      "ThreeMonthGift": {
        "Subscription": {}
      },
      "SixWeekly": {
        "Subscription": {}
      }
    }
  },
  "SubscriptionCard": {
    "currencies": [
      "GBP"
    ],
    "productRatePlans": {
      "Everyday": {
        "Monday": {},
        "Tuesday": {},
        "Saturday": {},
        "Thursday": {},
        "Friday": {},
        "Wednesday": {},
        "Sunday": {}
      },
      "Weekend": {
        "Saturday": {},
        "Sunday": {}
      },
      "Sixday": {
        "Saturday": {},
        "Friday": {},
        "Monday": {},
        "Tuesday": {},
        "Thursday": {},
        "Wednesday": {}
      },
      "Sunday": {
        "Sunday": {}
      },
      "Saturday": {
        "Saturday": {}
      }
    }
  },
  "Contribution": {
    "currencies": [
      "USD",
      "NZD",
      "EUR",
      "GBP",
      "CAD",
      "AUD"
    ],
    "productRatePlans": {
      "Annual": {
        "Contribution": {}
      },
      "Monthly": {
        "Contribution": {}
      }
    }
  },
  "HomeDelivery": {
    "currencies": [
      "GBP"
    ],
    "productRatePlans": {
      "Sixday": {
        "Wednesday": {},
        "Friday": {},
        "Thursday": {},
        "Monday": {},
        "Tuesday": {},
        "Saturday": {}
      },
      "Everyday": {
        "Tuesday": {},
        "Saturday": {},
        "Sunday": {},
        "Wednesday": {},
        "Friday": {},
        "Thursday": {},
        "Monday": {}
      },
      "Weekend": {
        "Sunday": {},
        "Saturday": {}
      },
      "Sunday": {
        "Sunday": {}
      },
      "Saturday": {
        "Saturday": {}
      }
    }
  }
} as const;