import { Button, Card, CardBody } from '@heroui/react';
import { useNavigate } from 'react-router';

const UnauthorizedPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--grud-bg)]">
      <Card className="max-w-md">
        <CardBody className="text-center p-8">
          <div className="text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold mb-2 text-red-600">Access Denied</h1>
          <p className="text-gray-600 mb-6">
            You don't have the required permissions to access this page.
          </p>
          <div className="flex gap-3 justify-center">
            <Button 
              color="primary" 
              onPress={() => navigate('/login')}
            >
              Login
            </Button>
            <Button 
              variant="light" 
              onPress={() => navigate('/')}
            >
              Go Home
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

export default UnauthorizedPage;