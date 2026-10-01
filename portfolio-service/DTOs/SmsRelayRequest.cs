namespace portfolio_service.DTOs;

// Kratos courier'ın gövdesi — kratos/sms-body.jsonnet üretir.
public record SmsRelayRequest(string To, string Message, string Type);
