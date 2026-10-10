import pytest
from django.urls import reverse


def test_old_api_mounted_under_old_prefix():
    assert reverse('api:get_players') == '/old/api/players'
    assert reverse('api_frontend:get_players') == '/api_frontend/players'


@pytest.mark.django_db
def test_old_frontend_served_under_old(client):
    response = client.get('/old/hraci')
    assert response.status_code == 200
    assert b'<base href="/old/">' in response.content
    assert b'ng-app="ufoIS"' in response.content


@pytest.mark.django_db
def test_old_frontend_root(client):
    response = client.get('/old/')
    assert response.status_code == 200
    assert b'<base href="/old/">' in response.content


@pytest.mark.django_db
def test_unknown_api_frontend_endpoint_is_404(client):
    assert client.get('/api_frontend/does_not_exist').status_code == 404
