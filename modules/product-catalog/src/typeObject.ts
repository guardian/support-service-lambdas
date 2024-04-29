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
        "Monday": {},
        "Tuesday": {},
        "Wednesday": {},
        "Thursday": {},
        "Friday": {},
        "Saturday": {}
      },
      "Weekend": {
        "Saturday": {},
        "Sunday": {}
      },
      "Everyday": {
        "Monday": {},
        "Tuesday": {},
        "Wednesday": {},
        "Thursday": {},
        "Friday": {},
        "Saturday": {},
        "Sunday": {}
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
        "Subscription": {},
        "Contribution": {}
      },
      "Annual": {
        "Contribution": {},
        "Subscription": {}
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
      }
    }
  },
  "SubscriptionCard": {
    "currencies": [
      "GBP"
    ],
    "productRatePlans": {
      "Sixday": {
        "Friday": {},
        "Monday": {},
        "Tuesday": {},
        "Thursday": {},
        "Wednesday": {},
        "Saturday": {}
      },
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
      "Everyday": {
        "Sunday": {},
        "Wednesday": {},
        "Friday": {},
        "Thursday": {},
        "Monday": {},
        "Tuesday": {},
        "Saturday": {}
      },
      "Sunday": {
        "Sunday": {}
      },
      "Sixday": {
        "Wednesday": {},
        "Friday": {},
        "Thursday": {},
        "Monday": {},
        "Tuesday": {},
        "Saturday": {}
      },
      "Weekend": {
        "Sunday": {},
        "Saturday": {}
      },
      "Saturday": {
        "Saturday": {}
      }
    }
  }
} as const;