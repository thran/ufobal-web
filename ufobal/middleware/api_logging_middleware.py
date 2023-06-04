from ufobalapp.models import Log


class ApiLoggingMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.user.is_authenticated:
            if request.method == 'POST' or request.method == 'DELETE':
                log = Log(user=request.user, url=request.path, data=request.body)
                log.save()
        return self.get_response(request)
