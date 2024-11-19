export const typeObject = {
  "GuardianLight": {
    "billingPeriods": [
      "Month"
    ],
    "productRatePlans": {
      "Monthly": {
        "GuardianLight": {}
      }
    }
  },
  "TierThree": {
    "billingPeriods": [
      "Annual",
      "Month"
    ],
    "productRatePlans": {
      "RestOfWorldAnnualV2": {
        "NewspaperArchive": {},
        "SupporterPlus": {},
        "GuardianWeekly": {}
      },
      "RestOfWorldMonthlyV2": {
        "SupporterPlus": {},
        "GuardianWeekly": {},
        "NewspaperArchive": {}
      },
      "DomesticAnnualV2": {
        "NewspaperArchive": {},
        "SupporterPlus": {},
        "GuardianWeekly": {}
      },
      "DomesticMonthlyV2": {
        "SupporterPlus": {},
        "GuardianWeekly": {},
        "NewspaperArchive": {}
      },
      "RestOfWorldMonthly": {
        "SupporterPlus": {},
        "GuardianWeekly": {}
      },
      "RestOfWorldAnnual": {
        "SupporterPlus": {},
        "GuardianWeekly": {}
      },
      "DomesticAnnual": {
        "SupporterPlus": {},
        "GuardianWeekly": {}
      },
      "DomesticMonthly": {
        "SupporterPlus": {},
        "GuardianWeekly": {}
      }
    }
  },
  "DigitalSubscription": {
    "billingPeriods": [
      "Quarter",
      "Month",
      "Annual"
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
    "billingPeriods": [
      "Month"
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
    "billingPeriods": [
      "Month",
      "Annual"
    ],
    "productRatePlans": {
      "V1DeprecatedMonthly": {
        "Subscription": {}
      },
      "V1DeprecatedAnnual": {
        "Subscription": {}
      },
      "Monthly": {
        "Subscription": {},
        "Contribution": {}
      },
      "Annual": {
        "Contribution": {},
        "Subscription": {}
      }
    }
  },
  "GuardianWeeklyRestOfWorld": {
    "billingPeriods": [
      "Month",
      "Annual",
      "Quarter"
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
    "billingPeriods": [
      "Annual",
      "Quarter",
      "Month"
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
    "billingPeriods": [
      "Month"
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
    "billingPeriods": [
      "Annual",
      "Month"
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
    "billingPeriods": [
      "Month"
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