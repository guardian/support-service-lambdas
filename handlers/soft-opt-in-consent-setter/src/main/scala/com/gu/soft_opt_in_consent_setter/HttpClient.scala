package com.gu.soft_opt_in_consent_setter

import okhttp3.{FormBody, MediaType, OkHttpClient, Request, RequestBody}

import java.util.concurrent.TimeUnit
import scala.util.Try

private[soft_opt_in_consent_setter] case class HttpResponse(body: String, code: Int) {
  def isSuccess: Boolean = code >= 200 && code < 300
}

private[soft_opt_in_consent_setter] object HttpClient {
  sealed trait TimeoutProfile {
    def connectTimeoutSeconds: Long
    def readTimeoutSeconds: Long
  }

  case object DefaultTimeout extends TimeoutProfile {
    override val connectTimeoutSeconds: Long = 10
    override val readTimeoutSeconds: Long = 10
  }

  case object SalesforceTimeout extends TimeoutProfile {
    override val connectTimeoutSeconds: Long = 10
    override val readTimeoutSeconds: Long = 60
  }

  case object MultipleAccountApiTimeout extends TimeoutProfile {
    override val connectTimeoutSeconds: Long = 3
    override val readTimeoutSeconds: Long = 15
  }

  private val jsonMediaType = MediaType.parse("application/json")

  private val clients: Map[TimeoutProfile, OkHttpClient] =
    Seq[TimeoutProfile](DefaultTimeout, SalesforceTimeout, MultipleAccountApiTimeout)
      .map(timeoutProfile => timeoutProfile -> buildClient(timeoutProfile))
      .toMap

  def get(
      url: String,
      headers: Seq[(String, String)] = Seq.empty,
      queryParameters: Seq[(String, String)] = Seq.empty,
      timeoutProfile: TimeoutProfile = DefaultTimeout,
  ): Either[Throwable, HttpResponse] = {
    val parsedUrl = new Request.Builder().url(url).build().url
    val urlWithQuery = queryParameters
      .foldLeft(parsedUrl.newBuilder()) { case (builder, (name, value)) =>
        builder.addQueryParameter(name, value)
      }
      .build()
    execute(withHeaders(new Request.Builder().url(urlWithQuery).get(), headers).build(), timeoutProfile)
  }

  def patch(
      url: String,
      body: String,
      headers: Seq[(String, String)] = Seq.empty,
      timeoutProfile: TimeoutProfile = DefaultTimeout,
  ): Either[Throwable, HttpResponse] =
    execute(
      withHeaders(new Request.Builder().url(url).patch(RequestBody.create(body, jsonMediaType)), headers).build(),
      timeoutProfile,
    )

  def postForm(
      url: String,
      formData: Seq[(String, String)],
      headers: Seq[(String, String)] = Seq.empty,
      timeoutProfile: TimeoutProfile = DefaultTimeout,
  ): Either[Throwable, HttpResponse] = {
    val formBody = formData
      .foldLeft(new FormBody.Builder()) { case (builder, (name, value)) =>
        builder.add(name, value)
      }
      .build()
    execute(withHeaders(new Request.Builder().url(url).post(formBody), headers).build(), timeoutProfile)
  }

  private def withHeaders(builder: Request.Builder, headers: Seq[(String, String)]): Request.Builder =
    headers.foldLeft(builder) { case (requestBuilder, (name, value)) =>
      requestBuilder.header(name, value)
    }

  private def execute(request: Request, timeoutProfile: TimeoutProfile): Either[Throwable, HttpResponse] =
    Try {
      val response = clients(timeoutProfile).newCall(request).execute()
      try HttpResponse(Option(response.body).fold("")(_.string()), response.code)
      finally response.close()
    }.toEither

  private def buildClient(timeoutProfile: TimeoutProfile): OkHttpClient =
    new OkHttpClient.Builder()
      .connectTimeout(timeoutProfile.connectTimeoutSeconds, TimeUnit.SECONDS)
      .readTimeout(timeoutProfile.readTimeoutSeconds, TimeUnit.SECONDS)
      .build()
}
