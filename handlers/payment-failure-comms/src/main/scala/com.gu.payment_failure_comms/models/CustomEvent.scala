package com.gu.payment_failure_comms.models

// Based on https://www.braze.com/docs/api/objects_filters/event_object/
case class CustomEvent(braze_id: String, app_id: String, name: String, time: String, properties: Map[String, String])
