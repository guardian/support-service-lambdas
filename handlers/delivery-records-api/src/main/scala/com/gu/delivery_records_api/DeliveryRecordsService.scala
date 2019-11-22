package com.gu.delivery_records_api

import java.time.LocalDate

import cats.effect.IO

final case class DeliveryRecord(deliveryDate: LocalDate, deliveryAddress: String, deliveryInstruction: String)

trait DeliveryRecordsService {
  def getDeliveryRecordsForSubscription(subscriptionId: String): IO[List[DeliveryRecord]]
}

object DeliveryRecordsService {
  def apply(): DeliveryRecordsService = new DeliveryRecordsService {
    override def getDeliveryRecordsForSubscription(subscriptionId: String): IO[List[DeliveryRecord]] =
      IO(
        List(
          DeliveryRecord(
            LocalDate.now(),
            "The Guardian, Kings Place, 90 York Way, King's Cross, London, N1 9GU",
            "Leave by the gnome"
          )
        )
      )
  }
}

